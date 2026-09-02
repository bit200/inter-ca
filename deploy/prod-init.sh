#!/usr/bin/env bash
# Первичное развёртывание inter-ca/admin (прод-фронтенд) на чистый Ubuntu/Debian VPS.
# Запускать один раз. На сервере код не правится руками, поэтому APP_DIR — это
# просто одна рабочая копия репозитория (git pull при каждом деплое), без
# releases/current — см. deploy/prod-deploy.sh для последующих деплоев.
#
# Использование:
#   1. Заполнить переменные в блоке CONFIG ниже (или передать через env перед вызовом).
#   2. Скопировать на VPS и выполнить от root:
#        scp deploy/prod-init.sh root@<VPS_IP>:/root/
#        ssh root@<VPS_IP> "bash /root/prod-init.sh"
#   3. Дальше для выкладки изменений использовать deploy/prod-deploy.sh.
#
# Что делает:
#   - ставит Node.js, nginx, certbot;
#   - клонирует репозиторий в APP_DIR, собирает фронт в APP_DIR/admin/build;
#   - настраивает nginx: раздача статики из APP_DIR/admin/build (путь постоянный —
#     деплой подменяет содержимое папки, а не сам путь). API-трафик (/api/v1/) этот
#     скрипт не проксирует — им владеет include-фрагмент от itk-platform-en (см.
#     комментарий у `include ... portal-itk-platform-en.conf*` ниже): это тот же
#     бэкенд, что и у их собственной админки, просто другой UI (кандидат vs ментор);
#   - выпускает TLS через certbot;
#   - включает автозапуск nginx при перезагрузке сервера (systemctl enable).
#
# Этот репозиторий — только фронт, бэкенд (включая api/) больше не разворачивается
# отсюда на проде — им целиком владеет itk-platform-en.

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском ====================
DOMAIN="${DOMAIN:-portal.itk.academy}"                          # прод-домен (A-запись должна уже указывать на этот VPS)
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-paulpetrash1@gmail.com}" # для certbot
GIT_REPO="${GIT_REPO:-git@github.com:bit200/inter-ca.git}"
GIT_BRANCH="${GIT_BRANCH:-master}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"                          # рабочая копия репозитория
NODE_MAJOR="${NODE_MAJOR:-20}"
SKIP_TLS="${SKIP_TLS:-0}"                                        # 1 = пропустить certbot (например, домен ещё не резолвится)
# ===================================================================================

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "Запускать от root (sudo)."
  exit 1
fi

if [ -e "${APP_DIR}" ]; then
  err "${APP_DIR} уже существует — prod-init.sh запускается один раз для первичной настройки."
  err "Для выкладки изменений используйте deploy/prod-deploy.sh."
  exit 1
fi

log "Обновляю пакеты и ставлю базовые зависимости"
apt-get update -y
apt-get install -y curl git nginx software-properties-common ca-certificates gnupg

# Если на сервере есть nvm, он подменяет node/npm в PATH при каждом новом shell'е —
# системный Node от NodeSource окажется недостижим, пока не выбрана нужная версия
# через nvm явно (иначе npm ci молча падает на старом npm с lockfileVersion 3:
# "Cannot read property '@babel/core' of undefined").
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${NVM_DIR}/nvm.sh"
  if ! nvm use "${NODE_MAJOR}" >/dev/null 2>&1; then
    log "Ставлю Node.js ${NODE_MAJOR}.x через nvm"
    nvm install "${NODE_MAJOR}"
    nvm use "${NODE_MAJOR}"
  fi
  nvm alias default "${NODE_MAJOR}"
  log "nvm: активна версия $(node -v)"
elif ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//;s/\..*//')" -lt "$NODE_MAJOR" ]; then
  log "Ставлю Node.js ${NODE_MAJOR}.x (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  log "Node.js уже установлен: $(node -v)"
fi

# npm cache verify чинит повреждённые записи в кэше (например "Cannot read
# property '@babel/core' of undefined" при npm ci) — не даёт им копиться
# и ломать сборку от деплоя к деплою.
log "Проверяю кэш npm"
npm cache verify

log "Клонирую ${GIT_REPO} (${GIT_BRANCH}) в ${APP_DIR}"
git clone --branch "${GIT_BRANCH}" "${GIT_REPO}" "${APP_DIR}"

cd "${APP_DIR}/admin"
log "npm ci (может занять пару минут)"
npm ci --no-audit --no-fund

BUILD_SHA="$(git -C "${APP_DIR}" rev-parse --short HEAD)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Собираю прод-бандл (npm run build), версия ${BUILD_SHA}"
DISABLE_ESLINT=true NODE_ENV=production REACT_APP_BUILD_SHA="${BUILD_SHA}" REACT_APP_BUILD_TIME="${BUILD_TIME}" npm run build

BUILD_DIR="${APP_DIR}/admin/build"
if [ ! -f "${BUILD_DIR}/index.html" ]; then
  err "Сборка не создала ${BUILD_DIR}/index.html — проверьте вывод npm run build выше."
  exit 1
fi

log "Настраиваю nginx для ${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${BUILD_DIR};
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

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

    # itk-platform-en (отдельный репозиторий, тот же ${DOMAIN}) добавляет
    # /admin/, /api/v1/, /upload/ через отдельный инклюд-файл, а не прямо в этот
    # heredoc - этот скрипт перезаписывает NGINX_CONF целиком при каждом запуске,
    # а инклюд-файл управляется тем репозиторием (см.
    # deploy/prod-portal.include.conf.template там) и не трогается отсюда. include
    # на путь без glob и с wildcard-суффиксом ("*") не ошибается, если файла ещё
    # нет - itk-platform-en, возможно, ещё не развёрнут на этом сервере на момент
    # первого запуска этого скрипта.
    #
    # inter-ca (этот репозиторий) — только фронт, весь его API-трафик идёт на
    # /api/v1/ - тот же бэкенд, что и у itk-platform-en'овской админки для
    # менторов, просто другой UI (кандидат сдаёт экзамен vs ментор его
    # проверяет). Свой отдельный location /api этот скрипт не создаёт.
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

log "Готово. Прод фронта: http://${DOMAIN} (или https, если certbot отработал)"
log "Рабочая копия: ${APP_DIR}, версия ${BUILD_SHA}"
warn "Проверьте, что https://${DOMAIN}/api/v1/... реально отвечает (itk-platform-en) — иначе фронт будет грузиться пустым"
warn "Для последующих деплоев изменений используйте deploy/prod-deploy.sh"
