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
#   sudo -u deploy /var/www/inter-ca/deploy/prod-deploy.sh [<полный SHA>]
#   sudo /usr/local/sbin/inter-ca-apply-build.sh
# Без аргумента — ветка GIT_BRANCH (master). С аргументом — ровно этот коммит
# (40 hex), ветка не двигается. Запуск неинтерактивный, tty не нужен (ssh без -t).
# APPLY_BUILD=1 — после сборки сам вызвать sudo -n inter-ca-apply-build.sh (кнопка
# выпуска в claude-tasks гоняет один скрипт). Кнопка берёт flock снаружи:
#   flock /var/lock/itk-deploy.lock deploy/prod-deploy.sh <sha>
# В stdout пишутся маркеры ::stage preflight|build|deliver|switch|health и ::version <sha>.
#
# Что делает этот скрипт (шаг 1):
#   1. git fetch + reset --hard на актуальный коммит ветки (без переклонирования).
#   2. Собирает фронт в admin/build-new.
#   3. Health-check нового билда (проверка index.html и статики на диске).
#   4. Кладёт build-new/version.json {revision, builtAt} (полный SHA из git).

set -euo pipefail

REQUESTED_SHA="${1:-}"

# ==================== CONFIG — отредактировать перед запуском (или передать через env) ====
GIT_BRANCH="${GIT_BRANCH:-master}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"
NODE_MAJOR="${NODE_MAJOR:-20}"                                    # см. NODE_MAJOR в prod-init.sh — версия, которую переключает nvm
# ============================================================================================

stage() { echo "::stage $1"; }

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

stage preflight

if [ -n "${REQUESTED_SHA}" ]; then
  REQUESTED_SHA="$(printf '%s' "${REQUESTED_SHA}" | tr 'A-F' 'a-f')"
  if ! [[ "${REQUESTED_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
    err "SHA должен быть полным (40 hex-символов), получено: ${REQUESTED_SHA}"
    exit 2
  fi
fi

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

if [ -n "${REQUESTED_SHA}" ]; then
  log "Подтягиваю origin и перехожу на ${REQUESTED_SHA}"
  git -C "${APP_DIR}" fetch origin
  if ! git -C "${APP_DIR}" cat-file -e "${REQUESTED_SHA}^{commit}" 2>/dev/null; then
    git -C "${APP_DIR}" fetch origin "${REQUESTED_SHA}" || true
  fi
  if ! git -C "${APP_DIR}" cat-file -e "${REQUESTED_SHA}^{commit}" 2>/dev/null; then
    err "Коммит ${REQUESTED_SHA} не найден в origin — деплой отменён."
    exit 1
  fi
  git -C "${APP_DIR}" checkout --detach "${REQUESTED_SHA}"
  git -C "${APP_DIR}" reset --hard "${REQUESTED_SHA}"
else
  log "Подтягиваю ${GIT_BRANCH} в ${APP_DIR}"
  git -C "${APP_DIR}" fetch origin "${GIT_BRANCH}"
  git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
  git -C "${APP_DIR}" reset --hard "origin/${GIT_BRANCH}"
fi

FULL_SHA="$(git -C "${APP_DIR}" rev-parse HEAD)"
if [ -n "${REQUESTED_SHA}" ] && [ "${FULL_SHA}" != "${REQUESTED_SHA}" ]; then
  err "После checkout HEAD=${FULL_SHA}, а нужен ${REQUESTED_SHA} — деплой отменён."
  exit 1
fi
NEW_COMMIT="$(git -C "${APP_DIR}" rev-parse --short HEAD)"
log "Новая версия на коммите ${NEW_COMMIT}"

stage build
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
stage deliver
printf '{"revision":"%s","builtAt":"%s"}\n' "${FULL_SHA}" "${BUILD_TIME}" > "${BUILD_NEW_DIR}/version.json"
log "version.json: ${FULL_SHA}"
log "Health-check билда пройден: index.html есть, статики файлов: ${STATIC_FILE_COUNT}"

log "Сборка готова в ${BUILD_NEW_DIR} (коммит ${NEW_COMMIT}, была ${PREVIOUS_COMMIT})."

if [ "${APPLY_BUILD:-0}" = "1" ]; then
  stage switch
  sudo -n /usr/local/sbin/inter-ca-apply-build.sh
  stage health
else
  log "Дальше: sudo /usr/local/sbin/inter-ca-apply-build.sh"
fi
echo "::version ${FULL_SHA}"
