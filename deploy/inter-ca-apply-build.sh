#!/usr/bin/env bash
# Прод-деплой inter-ca/admin, шаг 2/2: атомарно подменить admin/build на build-new,
# релоаднуть nginx и проверить, что сайт отвечает — с автоматическим откатом, если
# что-то не так. Запускается ПОСЛЕ deploy/prod-deploy.sh (шаг 1, собирает build-new).
#
# ЭТОТ ФАЙЛ УСТАНАВЛИВАЕТСЯ ВНЕ git-РАБОЧЕЙ КОПИИ, В /usr/local/sbin, И ПРИНАДЛЕЖИТ
# ROOT (см. deploy/self-hosted-runner.md, раздел 1). Он не должен быть доступен на
# запись пользователю deploy: deploy владеет /var/www/inter-ca (в том числе этой
# копией скрипта в git) и может пушить в master, а sudoers даёт deploy запуск этого
# скрипта от root без пароля — если бы deploy (или кто угодно, кто может смёржить
# коммит в master) мог отредактировать сам исполняемый файл, то sudo-правило
# «разрешить только этот один скрипт» ничего бы не ограничивало: deploy подменил
# бы содержимое скрипта на что угодно и получил бы произвольный код от root.
# Поэтому этот скрипт:
#   - не делает git pull/checkout и не запускает npm — только фиксированные
#     файловые операции над build/build-new/build-old внутри APP_DIR;
#   - обновляется на сервере вручную (`install -o root -g root -m 750 ...`), а не
#     git-пуллом — см. deploy/self-hosted-runner.md.
#
# Использование:
#   sudo /usr/local/sbin/inter-ca-apply-build.sh
#
# Что делает:
#   1. Проверяет, что build-new существует и прошёл health-check на диске.
#   2. Атомарно подменяет build: build -> build-old, build-new -> build. Путь build/
#      остаётся тем же, что прописан в root nginx-конфига — реген конфига не нужен.
#   3. Релоадит nginx, проверяет HTTP-доступность сайта (curl по DOMAIN).
#   4. Если health-check после подмены не прошёл — автоматически откатывает build
#      обратно на build-old.
#   5. Хранится только один предыдущий билд (build-old) — откат возможен на один шаг
#      назад. Код на сервере не правится вручную, поэтому откатывать git не нужно:
#      следующий деплой (шаг 1) всё равно подтянет актуальный master.

set -euo pipefail

# ==================== CONFIG — отредактировать перед запуском (или передать через env) ====
DOMAIN="${DOMAIN:-portal.itk.academy}"
APP_DIR="${APP_DIR:-/var/www/inter-ca}"
# https, не http: certbot --nginx --redirect (prod-init.sh) переводит порт 80 в
# 301 -> https, так что HTTP_CODE на порту 80 всегда был бы 301, даже когда сайт
# полностью здоров. Проверяется локально (127.0.0.1), чтобы не зависеть от
# внешнего DNS/файрвола — curl -k принимает сертификат несмотря на несовпадение
# имени хоста с IP.
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://127.0.0.1/}"
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

ADMIN_DIR="${APP_DIR}/admin"
BUILD_DIR="${ADMIN_DIR}/build"
BUILD_NEW_DIR="${ADMIN_DIR}/build-new"
BUILD_OLD_DIR="${ADMIN_DIR}/build-old"

if [ ! -d "${BUILD_DIR}" ]; then
  err "${BUILD_DIR} не найден — ${APP_DIR} не похож на инициализированный прод."
  err "Сначала выполните deploy/prod-init.sh."
  exit 1
fi

if [ ! -f "${BUILD_NEW_DIR}/index.html" ]; then
  err "${BUILD_NEW_DIR}/index.html не найден — нечего применять."
  err "Сначала выполните deploy/prod-deploy.sh (шаг 1, сборка от deploy)."
  exit 1
fi

STATIC_FILE_COUNT="$(find "${BUILD_NEW_DIR}/static" -type f 2>/dev/null | wc -l | tr -d ' ')"
if [ "${STATIC_FILE_COUNT}" -lt 1 ]; then
  err "В ${BUILD_NEW_DIR} нет статики (static пуст) — похоже на неполную сборку, не применяю."
  exit 1
fi

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
  err "Rollback выполнен. Новый билд НЕ применён, сайт отдаёт прежнюю статику."
  exit 1
fi

log "Деплой успешен, сайт отвечает HTTP 200."
log "Готово."
