#!/usr/bin/env bash
# Прод-деплой изменений inter-ca/admin: собрать новую версию, атомарно переключить
# на неё nginx (zero-downtime) и автоматически откатиться назад, если что-то не так.
# Первичное развёртывание сервера — deploy/prod-init.sh, этот скрипт запускать только
# после него (ожидает готовую структуру APP_DIR/{releases,current,shared} и nginx-конфиг).
#
# Ветка master НЕ обновляется автоматически из staging — в staging идёт разработка,
# в master попадают только стабильные, проверенные изменения. Перед запуском этого
# скрипта убедитесь, что нужные коммиты уже смёржены в master (git checkout master &&
# git merge staging && git push), иначе задеплоится то, что уже лежит в master сейчас.
#
# Использование:
#   ssh root@<VPS_IP> "bash /root/prod-deploy.sh"
#   (или положить скрипт на сервер один раз и просто запускать при каждом релизе)
#
# Что делает:
#   1. Клонирует свежий коммит ветки в новый releases/<timestamp>, отдельно от
#      текущего работающего релиза — сайт продолжает отдавать старую версию.
#   2. Собирает фронт в новом релизе.
#   3. Health-check нового билда (проверка index.html и статики на диске).
#   4. Атомарно переключает symlink current -> новый релиз, релоадит nginx.
#   5. Проверяет HTTP-доступность сайта после переключения (curl по DOMAIN).
#   6. Если health-check после переключения не прошёл — автоматически откатывает
#      symlink назад на предыдущий релиз и релоадит nginx.
#   7. Чистит старые релизы, оставляя последние KEEP_RELEASES.

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском (или передать через env) ====
DOMAIN="${DOMAIN:-portal.itk.academy}"
GIT_REPO="${GIT_REPO:-git@github.com:bit200/inter-ca.git}"
GIT_BRANCH="${GIT_BRANCH:-master}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/}"          # проверяется локально, чтобы не зависеть от внешнего DNS/файрвола
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-10}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-2}"                       # секунд между попытками
RUN_LOCAL_API="${RUN_LOCAL_API:-0}"                               # 1 = переустановить зависимости и перезапустить api/ через pm2
# ============================================================================================

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "Запускать от root (sudo)."
  exit 1
fi

RELEASES_DIR="${APP_DIR}/releases"
CURRENT_LINK="${APP_DIR}/current"

if [ ! -d "${RELEASES_DIR}" ] || [ ! -L "${CURRENT_LINK}" ]; then
  err "${APP_DIR} не похож на инициализированный прод (нет releases/ или current симлинка)."
  err "Сначала выполните deploy/prod-init.sh."
  exit 1
fi

PREVIOUS_RELEASE="$(readlink -f "${CURRENT_LINK}")"
log "Текущий релиз (для отката, если что-то пойдёт не так): ${PREVIOUS_RELEASE}"

RELEASE_TS="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_TS}"

log "Клонирую ${GIT_REPO} (${GIT_BRANCH}) в ${RELEASE_DIR}"
git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${RELEASE_DIR}"

NEW_COMMIT="$(git -C "${RELEASE_DIR}" rev-parse --short HEAD)"
log "Новый релиз на коммите ${NEW_COMMIT}"

cd "${RELEASE_DIR}/admin"
if [ -f "${PREVIOUS_RELEASE}/admin/package-lock.json" ] && cmp -s package-lock.json "${PREVIOUS_RELEASE}/admin/package-lock.json" && [ -d "${PREVIOUS_RELEASE}/admin/node_modules" ]; then
  log "package-lock.json не менялся — переиспользую node_modules предыдущего релиза"
  cp -a "${PREVIOUS_RELEASE}/admin/node_modules" node_modules
else
  log "npm install (может занять пару минут)"
  npm install --no-audit --no-fund
fi

BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Собираю прод-бандл (npm run build), версия ${NEW_COMMIT}"
DISABLE_ESLINT=true NODE_ENV=production REACT_APP_BUILD_SHA="${NEW_COMMIT}" REACT_APP_BUILD_TIME="${BUILD_TIME}" npm run build

BUILD_DIR="${RELEASE_DIR}/admin/build"

rollback_release_dir() {
  err "Откатываю неудачный релиз: удаляю ${RELEASE_DIR}"
  rm -rf "${RELEASE_DIR}"
}

if [ ! -f "${BUILD_DIR}/index.html" ]; then
  err "Сборка не создала ${BUILD_DIR}/index.html — новый релиз НЕ применяется, сайт остаётся на прежней версии."
  rollback_release_dir
  exit 1
fi

STATIC_FILE_COUNT="$(find "${BUILD_DIR}/static" -type f 2>/dev/null | wc -l | tr -d ' ')"
if [ "${STATIC_FILE_COUNT}" -lt 1 ]; then
  err "В новой сборке нет статики (build/static пуст) — новый релиз НЕ применяется."
  rollback_release_dir
  exit 1
fi
log "Health-check билда пройден: index.html есть, статики файлов: ${STATIC_FILE_COUNT}"

if [ "${RUN_LOCAL_API}" = "1" ] && [ -d "${RELEASE_DIR}/api" ]; then
  log "Обновляю зависимости api/ в новом релизе"
  cd "${RELEASE_DIR}/api"
  npm install --no-audit --no-fund --omit=dev || npm install --no-audit --no-fund
fi

log "Атомарно переключаю ${CURRENT_LINK} -> ${RELEASE_DIR}"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

if ! nginx -t; then
  err "nginx -t не прошёл после переключения релиза — откатываюсь на предыдущий релиз"
  ln -sfn "${PREVIOUS_RELEASE}" "${CURRENT_LINK}"
  rollback_release_dir
  exit 1
fi
systemctl reload nginx

if [ "${RUN_LOCAL_API}" = "1" ] && [ -d "${RELEASE_DIR}/api" ]; then
  log "Перезапускаю api/ через pm2 (zero-downtime reload)"
  cd "${RELEASE_DIR}/api"
  pm2 startOrReload ecosystem.config.js --update-env
  pm2 save
fi

log "Проверяю доступность сайта после переключения (${HEALTHCHECK_URL})"
HEALTHY=0
for i in $(seq 1 "${HEALTHCHECK_RETRIES}"); do
  HTTP_CODE="$(curl -sk -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" "${HEALTHCHECK_URL}" || echo 000)"
  if [ "${HTTP_CODE}" = "200" ]; then
    HEALTHY=1
    break
  fi
  warn "Попытка ${i}/${HEALTHCHECK_RETRIES}: сайт вернул HTTP ${HTTP_CODE}, жду ${HEALTHCHECK_DELAY}с"
  sleep "${HEALTHCHECK_DELAY}"
done

if [ "${HEALTHY}" -ne 1 ]; then
  err "Сайт не отвечает HTTP 200 после деплоя — откатываюсь на предыдущий релиз ${PREVIOUS_RELEASE}"
  ln -sfn "${PREVIOUS_RELEASE}" "${CURRENT_LINK}"
  nginx -t && systemctl reload nginx
  if [ "${RUN_LOCAL_API}" = "1" ] && [ -d "${PREVIOUS_RELEASE}/api" ]; then
    cd "${PREVIOUS_RELEASE}/api"
    pm2 startOrReload ecosystem.config.js --update-env || true
  fi
  rollback_release_dir
  err "Rollback выполнен. Новый релиз ${NEW_COMMIT} НЕ применён, сайт работает на прежней версии."
  exit 1
fi

log "Деплой успешен, сайт отвечает HTTP 200. Текущий релиз: ${RELEASE_DIR} (${NEW_COMMIT})"

log "Чищу старые релизы, оставляю последние ${KEEP_RELEASES}"
cd "${RELEASES_DIR}"
ls -1t | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
  rm -rf "${RELEASES_DIR:?}/${old}"
done

log "Готово."
