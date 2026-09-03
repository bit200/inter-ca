#!/usr/bin/env bash
# Прод-деплой изменений inter-ca/admin, шаг 1/2: подтянуть код (git pull) и собрать
# новую версию в build-new. Текущий admin/build не трогается, сайт продолжает
# отдавать старую версию, пока идёт сборка.
# Первичное развёртывание сервера — deploy/prod-init.sh, этот скрипт запускать только
# после него (ожидает готовую рабочую копию APP_DIR и nginx-конфиг с root на
# APP_DIR/admin/build).
#
# Запускается ЦЕЛИКОМ от пользователя deploy, БЕЗ root/sudo — этот файл и рабочая
# копия APP_DIR принадлежат deploy (см. deploy/self-hosted-runner.md), а npm ci /
# npm run build выполняют произвольный код зависимостей (postinstall-хуки и т.п.).
# Запускать это от root было бы дырой в привилегиях: кто угодно, кто может
# смёржить коммит в master (или у кого есть запись в APP_DIR), получил бы
# выполнение кода от root на следующем деплое.
#
# Шаг 2 — deploy/inter-ca-apply-build.sh, он и делает то, что реально требует root:
# атомарную подмену build/, nginx -t, systemctl reload, health-check по HTTP и
# откат. Этот скрипт лежит вне git-репозитория (/usr/local/sbin) и принадлежит
# root, а не deploy — деплой не может отредактировать собственный root-доступ
# через git push.
#
# Ветка master НЕ обновляется автоматически из staging — в staging идёт разработка,
# в master попадают только стабильные, проверенные изменения. Перед запуском этого
# скрипта убедитесь, что нужные коммиты уже смёржены в master (git checkout master &&
# git merge staging && git push), иначе задеплоится то, что уже лежит в master сейчас.
#
# Использование (два отдельных шага, см. .github/workflows/deploy-prod.yml):
#   sudo -u deploy /var/www/inter-ca/deploy/prod-deploy.sh
#   sudo /usr/local/sbin/inter-ca-apply-build.sh
#
# Что делает этот скрипт (шаг 1):
#   1. git fetch + reset --hard на актуальный коммит ветки (без переклонирования).
#   2. Собирает фронт в admin/build-new.
#   3. Health-check нового билда (проверка index.html и статики на диске).

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском (или передать через env) ====
GIT_BRANCH="${GIT_BRANCH:-master}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"
NODE_MAJOR="${NODE_MAJOR:-20}"                                    # см. NODE_MAJOR в prod-init.sh — версия, которую переключает nvm
# ============================================================================================

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

if [ "$(id -u)" -eq 0 ]; then
  err "Не запускать от root — этот скрипт выполняет npm ci/npm run build (код"
  err "зависимостей), поэтому работает от deploy. Root нужен только на шаге 2"
  err "(deploy/inter-ca-apply-build.sh), запускайте его отдельно через sudo."
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

log "Сборка готова в ${BUILD_NEW_DIR} (коммит ${NEW_COMMIT}, была ${PREVIOUS_COMMIT})."
log "Дальше: sudo /usr/local/sbin/inter-ca-apply-build.sh"
