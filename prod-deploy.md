# Деплой на прод

Прод фронтенда (`admin/`) разворачивается по схеме releases/current/shared (как в Capistrano):
каждый релиз клонируется в отдельную папку, а symlink `current` атомарно переключается на
новый релиз после успешной сборки и health-check. Это даёт zero-downtime деплой и мгновенный
откат при проблемах.

Скрипты лежат в `deploy/`:

- `deploy/prod-init.sh` — первичное развёртывание сервера (один раз).
- `deploy/prod-deploy.sh` — выкладка новой версии на уже настроенный сервер (при каждом релизе).

## Важно: ветка master

В `staging` идёт разработка, в `master` попадают только стабильные, проверенные изменения.
Скрипты деплоя **не мержат** `staging` в `master` автоматически — задеплоится то, что уже
лежит в `master` на момент запуска.

Перед деплоем на прод:

```bash
git checkout master
git merge staging
git push
```

## 1. Первичная настройка сервера (один раз)

Выполняется один раз на чистом Ubuntu/Debian VPS.

```bash
scp deploy/prod-init.sh root@<VPS_IP>:/root/
ssh root@<VPS_IP> "bash /root/prod-init.sh"
```

Что делает `prod-init.sh`:

1. Ставит Node.js, nginx, certbot, pm2.
2. Клонирует репозиторий в `APP_DIR/releases/<timestamp>`, собирает фронт (`npm run build`).
3. Переключает `APP_DIR/current` на этот релиз через symlink.
4. Настраивает nginx: раздача статики + reverse-proxy `/api` -> `BACKEND_UPSTREAM`.
5. Выпускает TLS-сертификат через certbot.
6. Включает автозапуск nginx при перезагрузке сервера.
7. Если `RUN_LOCAL_API=1` — поднимает `api/serve-admin.js` через pm2 и настраивает pm2 startup.

### Переменные окружения (можно переопределить перед запуском)

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DOMAIN` | `portal.itk.academy` | Прод-домен (A-запись должна уже указывать на VPS) |
| `LETSENCRYPT_EMAIL` | `paulpetrash1@gmail.com` | Email для certbot |
| `BACKEND_UPSTREAM` | `http://127.0.0.1:5200` | Куда nginx проксирует `/api` (локальный бэкенд на этом же VPS) |
| `GIT_REPO` | `git@github.com:bit200/inter-ca.git` | Репозиторий |
| `GIT_BRANCH` | `master` | Ветка для прода |
| `APP_DIR` | `/var/www/inter-ca` | Корень releases/current/shared |
| `NODE_MAJOR` | `20` | Мажорная версия Node.js |
| `SKIP_TLS` | `0` | `1` — пропустить certbot (например, домен ещё не резолвится) |
| `RUN_LOCAL_API` | `0` | `1` — поднять `api/serve-admin.js` через pm2 на этом сервере |
| `KEEP_RELEASES` | `5` | Сколько старых релизов хранить для быстрого rollback |

Пример с переопределением:

```bash
ssh root@<VPS_IP> "DOMAIN=portal.itk.academy RUN_LOCAL_API=1 bash /root/prod-init.sh"
```

## 2. Деплой новой версии (при каждом релизе)

После того как сервер инициализирован `prod-init.sh`, для выкладки изменений используется
`prod-deploy.sh`. Проще всего один раз положить его на сервер и запускать оттуда:

```bash
scp deploy/prod-deploy.sh root@<VPS_IP>:/root/
ssh root@<VPS_IP> "bash /root/prod-deploy.sh"
```

Или сразу через ssh без предварительного копирования, если скрипт уже на сервере:

```bash
ssh root@<VPS_IP> "bash /root/prod-deploy.sh"
```

### Что делает `prod-deploy.sh`

1. Клонирует свежий коммит ветки `master` в новый `releases/<timestamp>`, отдельно от
   текущего работающего релиза — сайт продолжает отдавать старую версию во время сборки.
2. Переиспользует `node_modules` предыдущего релиза, если `package-lock.json` не менялся,
   иначе выполняет `npm ci` (ставит версии строго по `package-lock.json`).
3. Собирает фронт (`npm run build`) с `REACT_APP_BUILD_SHA` и `REACT_APP_BUILD_TIME`.
4. Health-check билда: проверяет, что `build/index.html` создан и `build/static` не пуст.
   Если нет — новый релиз не применяется, старая версия остаётся рабочей.
5. Атомарно переключает symlink `current -> releases/<новый>` и релоадит nginx
   (`nginx -t` перед релоадом — если конфиг невалиден, откат на предыдущий релиз).
6. Если `RUN_LOCAL_API=1` — обновляет зависимости `api/` и делает zero-downtime reload
   через `pm2 startOrReload`.
7. Проверяет HTTP-доступность сайта после переключения (curl по `HEALTHCHECK_URL`,
   несколько попыток с задержкой).
8. Если сайт не отвечает `200` — автоматически откатывает symlink назад на предыдущий
   релиз, релоадит nginx и (если применимо) поднимает api предыдущего релиза через pm2.
9. Чистит старые релизы, оставляя последние `KEEP_RELEASES`.

### Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DOMAIN` | `portal.itk.academy` | Домен для health-check (`Host`-заголовок) |
| `GIT_REPO` | `git@github.com:bit200/inter-ca.git` | Репозиторий |
| `GIT_BRANCH` | `master` | Ветка для прода |
| `APP_DIR` | `/var/www/inter-ca` | Корень releases/current/shared |
| `KEEP_RELEASES` | `5` | Сколько старых релизов хранить |
| `HEALTHCHECK_URL` | `http://127.0.0.1/` | Локальный health-check (без зависимости от внешнего DNS) |
| `HEALTHCHECK_RETRIES` | `10` | Число попыток health-check |
| `HEALTHCHECK_DELAY` | `2` | Секунд между попытками |
| `RUN_LOCAL_API` | `0` | `1` — переустановить зависимости и перезапустить `api/` через pm2 |

Требования: скрипт нужно запускать от `root`, и на сервере уже должна быть готовая
структура `APP_DIR/{releases,current,shared}` и nginx-конфиг (то есть `prod-init.sh` уже
выполнялся).

## Откат (rollback)

Откат на предыдущий релиз происходит автоматически внутри `prod-deploy.sh`, если:

- сборка не создала `index.html` или статику;
- `nginx -t` не прошёл после переключения символической ссылки;
- сайт не ответил `HTTP 200` после переключения (в пределах `HEALTHCHECK_RETRIES`).

Ручной откат на конкретный старый релиз (если он ещё не вычищен):

```bash
ssh root@<VPS_IP>
ls -1t /var/www/inter-ca/releases        # найти нужный timestamp
ln -sfn /var/www/inter-ca/releases/<timestamp> /var/www/inter-ca/current
nginx -t && systemctl reload nginx
```

## Проверка после деплоя

- Открыть `https://<DOMAIN>` в браузере и убедиться, что сайт грузится.
- Проверить, что `BACKEND_UPSTREAM` отвечает на нужные API-эндпоинты (например,
  `/api/mock-interview/ping`) — иначе фронт может загрузиться пустым.
- При `RUN_LOCAL_API=1` — проверить процесс: `pm2 status`, `pm2 logs`.
