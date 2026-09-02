#!/usr/bin/env bash
# Первичное развёртывание inter-ca/admin (прод-фронтенд) на чистый Ubuntu/Debian VPS.
# Запускать один раз сразу после первого git clone (или вообще без локального клона —
# скрипт сам клонирует репозиторий на сервере).
#
# Использование:
#   1. Заполнить переменные в блоке CONFIG ниже (или передать через env перед вызовом).
#   2. Скопировать на VPS и выполнить от root:
#        scp deploy/prod-init.sh root@<VPS_IP>:/root/
#        ssh root@<VPS_IP> "bash /root/prod-init.sh"
#   3. Дальше для выкладки изменений использовать deploy/prod-deploy.sh — он живёт уже
#      внутри APP_DIR/current и просто раскатывает новые релизы поверх этой базы.
#
# Что делает:
#   - ставит Node.js, nginx, certbot, pm2;
#   - клонирует репозиторий в APP_DIR/releases/<timestamp>, собирает фронт;
#   - переключает APP_DIR/current на свежий релиз через symlink (для будущих
#     zero-downtime деплоев и rollback скриптом prod-deploy.sh);
#   - настраивает nginx: раздача статики + reverse-proxy /api -> BACKEND_UPSTREAM;
#   - выпускает TLS через certbot;
#   - включает автозапуск nginx при перезагрузке сервера (systemctl enable);
#   - если включён локальный API (RUN_LOCAL_API=1) — поднимает api/serve-admin.js
#     через pm2 и настраивает pm2 startup, чтобы процесс поднимался сам после reboot.

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском ====================
DOMAIN="${DOMAIN:-portal.itk.academy}"                          # прод-домен (A-запись должна уже указывать на этот VPS)
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-paulpetrash1@gmail.com}" # для certbot
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-https://api-razvitie.itk.academy}" # куда nginx проксирует /api
GIT_REPO="${GIT_REPO:-git@github.com:bit200/inter-ca.git}"
GIT_BRANCH="${GIT_BRANCH:-master}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"                          # APP_DIR/current -> APP_DIR/releases/<ts>
NODE_MAJOR="${NODE_MAJOR:-20}"
SKIP_TLS="${SKIP_TLS:-0}"                                        # 1 = пропустить certbot (например, домен ещё не резолвится)
RUN_LOCAL_API="${RUN_LOCAL_API:-0}"                               # 1 = поднять api/serve-admin.js через pm2 на этом сервере
KEEP_RELEASES="${KEEP_RELEASES:-5}"                               # сколько старых релизов хранить для быстрого rollback
# ===================================================================================

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "Запускать от root (sudo)."
  exit 1
fi

RELEASES_DIR="${APP_DIR}/releases"
CURRENT_LINK="${APP_DIR}/current"
SHARED_DIR="${APP_DIR}/shared"
RELEASE_TS="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_TS}"

log "Обновляю пакеты и ставлю базовые зависимости"
apt-get update -y
apt-get install -y curl git nginx software-properties-common ca-certificates gnupg

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//;s/\..*//')" -lt "$NODE_MAJOR" ]; then
  log "Ставлю Node.js ${NODE_MAJOR}.x (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  log "Node.js уже установлен: $(node -v)"
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Ставлю pm2 глобально"
  npm install -g pm2 --no-audit --no-fund
else
  log "pm2 уже установлен: $(pm2 -v)"
fi

log "Готовлю структуру каталогов ${APP_DIR} (releases/current/shared)"
mkdir -p "${RELEASES_DIR}" "${SHARED_DIR}"

log "Клонирую ${GIT_REPO} (${GIT_BRANCH}) в ${RELEASE_DIR}"
git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${RELEASE_DIR}"

cd "${RELEASE_DIR}/admin"
log "npm ci (может занять пару минут)"
npm ci --no-audit --no-fund

BUILD_SHA="$(git -C "${RELEASE_DIR}" rev-parse --short HEAD)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Собираю прод-бандл (npm run build), версия ${BUILD_SHA}"
DISABLE_ESLINT=true NODE_ENV=production REACT_APP_BUILD_SHA="${BUILD_SHA}" REACT_APP_BUILD_TIME="${BUILD_TIME}" npm run build

BUILD_DIR="${RELEASE_DIR}/admin/build"
if [ ! -f "${BUILD_DIR}/index.html" ]; then
  err "Сборка не создала ${BUILD_DIR}/index.html — проверьте вывод npm run build выше."
  exit 1
fi

log "Переключаю ${CURRENT_LINK} -> ${RELEASE_DIR}"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

CURRENT_BUILD_DIR="${CURRENT_LINK}/admin/build"

log "Настраиваю nginx для ${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${CURRENT_BUILD_DIR};
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /api {
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header Host \$http_host;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_pass ${BACKEND_UPSTREAM};
    }

    # SPA-фоллбек: все остальные пути отдаём index.html, роутинг решает react-router.
    # index.html — всегда no-cache: он ссылается на хэшированные JS/CSS, и после деплоя
    # браузер должен каждый раз перепроверять, не переехали ли ссылки на новую версию.
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Хэшированная CRA-статика (main.<hash>.js и т.п.) неизменна по содержимому —
    # можно кэшировать надолго и без ревалидации.
    location ~* \.(?:js|css|svg|png|jpg|jpeg|gif|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # itk-platform-en (админка/API для менторов - отдельный репозиторий, тот же
    # ${DOMAIN}) добавляет свои /admin/, /api/v1/, /upload/ через отдельный
    # инклюд-файл, а не прямо в этот heredoc - этот скрипт перезаписывает
    # NGINX_CONF целиком при каждом запуске, а инклюд-файл управляется тем
    # репозиторием (см. deploy/prod-portal.include.conf.template там) и не
    # трогается отсюда. include на путь без glob и с wildcard-суффиксом ("*")
    # не ошибается, если файла ещё нет - itk-platform-en, возможно, ещё не
    # развёрнут на этом сервере на момент первого запуска этого скрипта.
    include /etc/nginx/sites-available/portal-itk-platform-en.conf*;
}
EOF

ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
nginx -t
systemctl reload nginx

log "Включаю автозапуск nginx при перезагрузке сервера"
systemctl enable nginx

if [ "${SKIP_TLS}" != "1" ]; then
  log "Выпускаю TLS-сертификат через certbot"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "${DOMAIN}" -m "${LETSENCRYPT_EMAIL}" --agree-tos --non-interactive --redirect || \
    warn "certbot не прошёл — проверьте, что DNS-запись ${DOMAIN} уже указывает на этот VPS, и перезапустите с SKIP_TLS=0 позже"
  log "Проверяю автообновление сертификата (certbot ставит systemd timer сам)"
  systemctl list-timers --all | grep -q certbot && log "certbot.timer активен" || warn "certbot.timer не найден — обновление сертификата может не сработать автоматически"
else
  warn "SKIP_TLS=1 — сертификат не выпускаю, сайт доступен только по http://${DOMAIN}"
fi

if [ "${RUN_LOCAL_API}" = "1" ]; then
  log "Поднимаю api/serve-admin.js через pm2"
  cd "${CURRENT_LINK}/api"
  npm ci --no-audit --no-fund --omit=dev || npm ci --no-audit --no-fund
  pm2 startOrReload ecosystem.config.js --update-env
  pm2 save

  log "Настраиваю автозапуск pm2 при перезагрузке сервера"
  PM2_STARTUP_CMD="$(pm2 startup systemd -u root --hp /root | tail -n 1)"
  if [[ "${PM2_STARTUP_CMD}" == *systemctl* ]]; then
    eval "${PM2_STARTUP_CMD}"
  else
    warn "Не удалось автоматически распарсить команду pm2 startup — выполните её вручную (см. вывод pm2 startup выше)"
  fi
fi

log "Чищу старые релизы, оставляю последние ${KEEP_RELEASES}"
cd "${RELEASES_DIR}"
ls -1t | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
  rm -rf "${RELEASES_DIR:?}/${old}"
done

log "Готово. Прод фронта: http://${DOMAIN} (или https, если certbot отработал)"
log "Текущий релиз: ${RELEASE_DIR} (симлинк ${CURRENT_LINK}), версия ${BUILD_SHA}"
warn "Проверьте, что ${BACKEND_UPSTREAM}/... реально отвечает — иначе фронт будет грузиться пустым"
warn "Для последующих деплоев изменений используйте deploy/prod-deploy.sh"
