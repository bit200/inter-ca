#!/usr/bin/env bash
# Деплой itk-sso: git pull -> пересборка стека -> health-check, при неудаче откат на
# предыдущий коммит и пересборка на нём, чтобы деплой не оставлял стенд лежащим.
# Скрипт самостоятельный: свой .env и свой docker-compose.yml рядом, ничего из
# itk-platform-en не требуется — сервис разворачивается на отдельном VPS.
set -euo pipefail

cd "$(dirname "$0")"

# Порт берём из того же .env, что читает docker compose, чтобы не дублировать
# конфигурацию: PORT — порт, на котором слушает сервис и внутри контейнера, и снаружи.
env_value() {
  # $1 — файл, $2 — имя переменной. Пусто, если файла/переменной нет.
  [ -f "$1" ] || return 0
  grep -E "^${2}=" "$1" | tail -n 1 | cut -d= -f2- | tr -d '"'"'"' \r'
}

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
err()  { echo -e "\033[1;31m!!\033[0m $*" >&2; }

if [ ! -f .env ]; then
  err ".env рядом с deploy.sh не найден: скопируйте .env.example и заполните (как минимум SSO_ISSUER и SSO_COOKIE_KEYS)"
  exit 1
fi

SSO_PORT="$(env_value .env PORT)"
SSO_PORT="${SSO_PORT:-7545}"
# В интерполяции docker compose переменная окружения побеждает .env: если PORT задан
# в шелле (так бывает у CI-раннеров), контейнер уехал бы на чужой порт, а health-check
# стучался бы на порт из .env. Навязываем compose то же значение, с которым работаем сами.
export PORT="${SSO_PORT}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-20}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-3}"

# Ключ подписи RS256 монтируется с хоста (keys/ в docker-compose.yml). Если его нет,
# сервис сгенерирует свой на старте — и все выданные токены умрут при следующем
# рестарте. Для деплоя это молчаливая потеря сессий, поэтому заводим ключ сами.
ensure_signing_key() {
  local key_file
  key_file="$(env_value .env SSO_JWT_PRIVATE_KEY_FILE)"
  [ -n "${key_file}" ] || return 0
  # Путь в .env — как его видит контейнер (/app/keys/...); на хосте это ./keys/...
  local host_file="${key_file#/app/}"
  if [ -f "${host_file}" ]; then
    return 0
  fi
  mkdir -p "$(dirname "${host_file}")"
  log "Ключ подписи ${host_file} не найден — генерирую RSA-2048"
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${host_file}"
  chmod 600 "${host_file}"
}

# Ждём, пока URL начнёт отдавать ожидаемый HTTP-код. Возвращает 1, если так и не дождались.
wait_for_http() {
  local name="$1" url="$2" expected="$3" code=000
  for i in $(seq 1 "${HEALTHCHECK_RETRIES}"); do
    code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 "${url}" || echo 000)"
    if [ "${code}" = "${expected}" ]; then
      log "health-check ${name}: HTTP ${code} (${url})"
      return 0
    fi
    warn "health-check ${name}: попытка ${i}/${HEALTHCHECK_RETRIES}, HTTP ${code}, жду ${HEALTHCHECK_DELAY}с"
    sleep "${HEALTHCHECK_DELAY}"
  done
  err "health-check ${name} не прошёл: ${url} отдаёт HTTP ${code}, ожидался ${expected}"
  return 1
}

healthcheck_stack() {
  # /healthz — сам express (src/server.js): поднялся процесс и подключилась база.
  wait_for_http sso "http://127.0.0.1:${SSO_PORT}/healthz" 200 || return 1
  # Дискавери отдаёт уже сам провайдер: живой процесс без работающего OIDC —
  # не деплой, а тишина, в которую внешние системы упрутся первым же запросом.
  wait_for_http discovery "http://127.0.0.1:${SSO_PORT}/.well-known/openid-configuration" 200 || return 1
  # JWKS: ресурс-серверы проверяют подпись локально, без него токены никому не нужны.
  wait_for_http jwks "http://127.0.0.1:${SSO_PORT}/.well-known/jwks.json" 200 || return 1
  return 0
}

PREVIOUS_COMMIT="$(git rev-parse HEAD)"
log "Текущий коммит: $(git rev-parse --short HEAD)"

git pull
log "Разворачиваю коммит $(git rev-parse --short HEAD)"
ensure_signing_key
docker compose up -d --build

log "Проверяю стек: sso :${SSO_PORT}"
if healthcheck_stack; then
  log "Деплой успешен, стек отвечает. Версия: $(git rev-parse --short HEAD)"
  exit 0
fi

err "Стек не поднялся — откатываюсь на ${PREVIOUS_COMMIT:0:7} и пересобираю на нём"
docker compose logs --tail 50 || true
git reset --hard "${PREVIOUS_COMMIT}"
docker compose up -d --build

if healthcheck_stack; then
  err "Откат выполнен: стек снова на ${PREVIOUS_COMMIT:0:7}, новая версия НЕ применена."
else
  err "Откат на ${PREVIOUS_COMMIT:0:7} тоже не отвечает health-check — нужен ручной разбор на сервере."
fi
exit 1
