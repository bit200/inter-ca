#!/usr/bin/env bash
# Быстрый деплой inter-ca/admin (только фронтенд) на чистый Ubuntu/Debian VPS.
# Бэкенд разворачивается отдельно — этот скрипт только проксирует /api на него.
#
# Использование:
#   1. Заполнить переменные в блоке CONFIG ниже (или передать через env перед вызовом).
#   2. Скопировать на VPS и выполнить от root:
#        scp deploy/staging-deploy.sh root@<VPS_IP>:/root/
#        ssh root@<VPS_IP> "bash /root/staging-deploy.sh"
#   3. Повторный запуск безопасен — просто обновит код (git pull) и пересоберёт фронт.
#
# Важно про admin_env.js: домен API для стейджинга захардкожен в servers.staging
# (см. admin_env.js) и указывает прямо на staging-api-razvitie.itk.academy — браузер
# ходит на бэкенд напрямую, а не через nginx этого хоста. BACKEND_UPSTREAM/проксирование
# /api ниже оставлены как резерв на случай, если понадобится обратный прокси.

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском ====================
DOMAIN="${DOMAIN:-staging-app.itk.academy}"                   # домен стейджинга (A-запись должна уже указывать на этот VPS)
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-paulpetrash1@gmail.com}" # для certbot
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-http://127.0.0.1:6057}" # куда nginx проксирует /api (адрес уже развёрнутого бэкенда — поправить, когда бэк будет готов)
GIT_REPO="${GIT_REPO:-git@github.com:bit200/inter-ca.git}"
GIT_BRANCH="${GIT_BRANCH:-staging}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"
NODE_MAJOR="${NODE_MAJOR:-20}"
SKIP_TLS="${SKIP_TLS:-0}"                                     # 1 = пропустить certbot (например, домен ещё не резолвится)
# ===================================================================================

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Запускать от root (sudo)." >&2
  exit 1
fi

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

log "Клонирую/обновляю ${GIT_REPO} (${GIT_BRANCH}) в ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch origin "${GIT_BRANCH}"
  git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
  git -C "${APP_DIR}" reset --hard "origin/${GIT_BRANCH}"
else
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${GIT_BRANCH}" "${GIT_REPO}" "${APP_DIR}"
fi

cd "${APP_DIR}/admin"
if [ -d node_modules ] && [ -f node_modules/.package-lock.json ] && cmp -s package-lock.json node_modules/.package-lock.json; then
  log "node_modules актуальны (package-lock.json не менялся), пропускаю npm install"
else
  log "npm install (может занять пару минут)"
  npm install --no-audit --no-fund
fi

log "Собираю прод-бандл (npm run build)"
DISABLE_ESLINT=true NODE_ENV=production npm run build

BUILD_DIR="${APP_DIR}/admin/build"
if [ ! -f "${BUILD_DIR}/index.html" ]; then
  echo "Сборка не создала ${BUILD_DIR}/index.html — проверьте вывод npm run build выше." >&2
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

    location /api {
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header Host \$http_host;
        proxy_pass ${BACKEND_UPSTREAM};
    }

    # SPA-фоллбек: все остальные пути отдаём index.html, роутинг решает react-router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(?:js|css|svg|png|jpg|jpeg|gif|ico|woff2?)$ {
        expires 7d;
        access_log off;
    }
}
EOF

ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
nginx -t
systemctl reload nginx

if [ "${SKIP_TLS}" != "1" ]; then
  log "Выпускаю TLS-сертификат через certbot"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "${DOMAIN}" -m "${LETSENCRYPT_EMAIL}" --agree-tos --non-interactive --redirect || \
    warn "certbot не прошёл — проверьте, что DNS-запись ${DOMAIN} уже указывает на этот VPS, и перезапустите с SKIP_TLS=0 позже"
else
  warn "SKIP_TLS=1 — сертификат не выпускаю, сайт доступен только по http://${DOMAIN}"
fi

log "Готово. Стейджинг фронта: http://${DOMAIN} (или https, если certbot отработал)"
warn "Проверьте, что ${BACKEND_UPSTREAM} реально отвечает на /api/mock-interview/ping — иначе фронт будет грузиться пустым"
