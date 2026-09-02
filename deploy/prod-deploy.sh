#!/usr/bin/env bash
# Прод-деплой изменений inter-ca/admin: подтянуть код (git pull), собрать новую версию
# в build-new, атомарно подменить ей текущий build (zero-downtime) и автоматически
# откатиться на предыдущий билд, если что-то не так.
# Первичное развёртывание сервера — deploy/prod-init.sh, этот скрипт запускать только
# после него (ожидает готовую рабочую копию APP_DIR и nginx-конфиг с root на
# APP_DIR/admin/build).
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
#   1. git fetch + reset --hard на актуальный коммит ветки (без переклонирования).
#   2. Собирает фронт в admin/build-new — текущий admin/build не трогается, сайт
#      продолжает отдавать старую версию, пока идёт сборка.
#   3. Health-check нового билда (проверка index.html и статики на диске).
#   4. Атомарно подменяет build: build -> build-old, build-new -> build. Путь build/
#      остаётся тем же, что прописан в root nginx-конфига — реген конфига не нужен.
#   5. Релоадит nginx, проверяет HTTP-доступность сайта (curl по DOMAIN).
#   6. Если health-check после подмены не прошёл — автоматически откатывает build
#      обратно на build-old.
#   7. Хранится только один предыдущий билд (build-old) — откат возможен на один шаг
#      назад. Код на сервере не правится вручную, поэтому откатывать git не нужно:
#      следующий деплой всё равно подтянет актуальный master.

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском (или передать через env) ====
DOMAIN="${DOMAIN:-portal.itk.academy}"
GIT_BRANCH="${GIT_BRANCH:-master}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"
NODE_MAJOR="${NODE_MAJOR:-20}"                                    # см. NODE_MAJOR в prod-init.sh — версия, которую переключает nvm
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/}"          # проверяется локально, чтобы не зависеть от внешнего DNS/файрвола
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-10}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-2}"                       # секунд между попытками
# ============================================================================================

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "Запускать от root (sudo)."
  exit 1
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  err "${APP_DIR} не похож на инициализированный прод (нет .git)."
  err "Сначала выполните deploy/prod-init.sh."
  exit 1
fi

ADMIN_DIR="${APP_DIR}/admin"
BUILD_DIR="${ADMIN_DIR}/build"
BUILD_NEW_DIR="${ADMIN_DIR}/build-new"
BUILD_OLD_DIR="${ADMIN_DIR}/build-old"

if [ ! -d "${BUILD_DIR}" ]; then
  err "${BUILD_DIR} не найден — ${APP_DIR} не похож на инициализированный прод."
  err "Сначала выполните deploy/prod-init.sh."
  exit 1
fi

# Если на сервере есть nvm, он подменяет node/npm в PATH при каждом новом shell'е —
# без явного nvm use здесь может оказаться активна старая версия (например Node 14 /
# npm 6, который не умеет lockfileVersion 3 и падает на npm ci с "Cannot read
# property '@babel/core' of undefined"), даже если prod-init.sh ставил Node 20.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${NVM_DIR}/nvm.sh"
  nvm use "${NODE_MAJOR}" >/dev/null
  log "nvm: активна версия $(node -v)"
fi

log "Проверяю кэш npm"
npm cache verify

PREVIOUS_COMMIT="$(git -C "${APP_DIR}" rev-parse --short HEAD)"
log "Текущий коммит: ${PREVIOUS_COMMIT}"

log "Подтягиваю ${GIT_BRANCH} в ${APP_DIR}"
git -C "${APP_DIR}" fetch origin "${GIT_BRANCH}"
git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
git -C "${APP_DIR}" reset --hard "origin/${GIT_BRANCH}"

NEW_COMMIT="$(git -C "${APP_DIR}" rev-parse --short HEAD)"
log "Новая версия на коммите ${NEW_COMMIT}"

cd "${ADMIN_DIR}"
log "npm ci (может занять пару минут)"
npm ci --no-audit --no-fund

rm -rf "${BUILD_NEW_DIR}"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Собираю прод-бандл в build-new (npm run build), версия ${NEW_COMMIT}"
BUILD_PATH="build-new" DISABLE_ESLINT=true NODE_ENV=production REACT_APP_BUILD_SHA="${NEW_COMMIT}" REACT_APP_BUILD_TIME="${BUILD_TIME}" npm run build

if [ ! -f "${BUILD_NEW_DIR}/index.html" ]; then
  err "Сборка не создала ${BUILD_NEW_DIR}/index.html — новая версия НЕ применяется, сайт остаётся на прежней версии."
  rm -rf "${BUILD_NEW_DIR}"
  exit 1
fi

STATIC_FILE_COUNT="$(find "${BUILD_NEW_DIR}/static" -type f 2>/dev/null | wc -l | tr -d ' ')"
if [ "${STATIC_FILE_COUNT}" -lt 1 ]; then
  err "В новой сборке нет статики (build-new/static пуст) — новая версия НЕ применяется."
  rm -rf "${BUILD_NEW_DIR}"
  exit 1
fi
log "Health-check билда пройден: index.html есть, статики файлов: ${STATIC_FILE_COUNT}"

log "Атомарно подменяю ${BUILD_DIR}: старый билд -> build-old, build-new -> build"
rm -rf "${BUILD_OLD_DIR}"
mv "${BUILD_DIR}" "${BUILD_OLD_DIR}"
mv "${BUILD_NEW_DIR}" "${BUILD_DIR}"

rollback_build() {
  err "Откатываю build обратно на build-old"
  rm -rf "${BUILD_DIR}"
  mv "${BUILD_OLD_DIR}" "${BUILD_DIR}"
}

if ! nginx -t; then
  err "nginx -t не прошёл после подмены билда — откатываюсь"
  rollback_build
  exit 1
fi
systemctl reload nginx

log "Проверяю доступность сайта после подмены (${HEALTHCHECK_URL})"
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
  err "Сайт не отвечает HTTP 200 после деплоя — откатываюсь на предыдущий билд"
  rollback_build
  nginx -t && systemctl reload nginx
  err "Rollback выполнен. Билд версии ${NEW_COMMIT} НЕ применён, сайт отдаёт прежнюю статику."
  err "Код в ${APP_DIR} остался на коммите ${NEW_COMMIT} (git не откатывается) — при следующем деплое соберётся заново."
  exit 1
fi

log "Деплой успешен, сайт отвечает HTTP 200. Версия: ${NEW_COMMIT} (была ${PREVIOUS_COMMIT})"
log "Готово."
