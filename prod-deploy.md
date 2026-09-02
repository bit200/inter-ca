# Деплой на прод

Прод фронтенда (`admin/`) — это одна рабочая копия репозитория на сервере (`APP_DIR`).
Деплой делает `git pull` (fetch + reset --hard) на месте, собирает новую версию в отдельную
папку `admin/build-new` (пока идёт сборка, сайт продолжает отдавать старую статику из
`admin/build`), а затем атомарно подменяет билд: `build -> build-old`, `build-new -> build`.
Путь `admin/build`, прописанный в nginx как `root`, никогда не меняется — реген nginx-конфига
не нужен. Это даёт zero-downtime деплой и откат на один шаг назад при проблемах.

Код на сервере руками не правится — если билд после деплоя не проходит health-check, скрипт
откатывает статику на `build-old`, но git-состояние оставляет как есть (следующий деплой всё
равно подтянет актуальный `master`).

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

Выполняется один раз на чистом Ubuntu/Debian VPS. `prod-init.sh` отказывается запускаться,
если `APP_DIR` уже существует — он не предназначен для повторного запуска.

```bash
scp deploy/prod-init.sh root@<VPS_IP>:/root/
ssh root@<VPS_IP> "bash /root/prod-init.sh"
```

Что делает `prod-init.sh`:

1. Ставит Node.js, nginx, certbot, pm2.
2. Проверяет кэш npm (`npm cache verify`).
3. Клонирует репозиторий прямо в `APP_DIR` (без releases/current), собирает фронт
   (`npm run build`) в `APP_DIR/admin/build`.
4. Настраивает nginx: `root` указывает напрямую на `APP_DIR/admin/build` + reverse-proxy
   `/api` -> `BACKEND_UPSTREAM`.
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
| `APP_DIR` | `/var/www/inter-ca` | Рабочая копия репозитория |
| `NODE_MAJOR` | `20` | Мажорная версия Node.js |
| `SKIP_TLS` | `0` | `1` — пропустить certbot (например, домен ещё не резолвится) |
| `RUN_LOCAL_API` | `0` | `1` — поднять `api/serve-admin.js` через pm2 на этом сервере |

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

1. Проверяет кэш npm (`npm cache verify`).
2. `git fetch` + `git checkout` + `git reset --hard origin/master` в `APP_DIR` — рабочая
   копия подтягивается на месте, без переклонирования.
3. `npm ci` (ставит версии строго по `package-lock.json`).
4. Собирает фронт в `admin/build-new` (`npm run build` с `BUILD_PATH=build-new`,
   `REACT_APP_BUILD_SHA`, `REACT_APP_BUILD_TIME`) — текущий `admin/build` не трогается, сайт
   продолжает отдавать старую версию во время сборки.
5. Health-check билда: проверяет, что `build-new/index.html` создан и `build-new/static` не
   пуст. Если нет — новая версия не применяется, старая статика остаётся рабочей.
6. Атомарно подменяет билд: `build -> build-old`, `build-new -> build`, релоадит nginx
   (`nginx -t` перед релоадом — если конфиг невалиден, откат на `build-old`).
7. Если `RUN_LOCAL_API=1` — обновляет зависимости `api/` и делает zero-downtime reload
   через `pm2 startOrReload`.
8. Проверяет HTTP-доступность сайта после подмены (curl по `HEALTHCHECK_URL`, несколько
   попыток с задержкой).
9. Если сайт не отвечает `200` — автоматически откатывает `build` обратно на `build-old`
   и релоадит nginx. Git-состояние при этом не откатывается — код никто не читает и не
   правит на сервере, а следующий деплой всё равно подтянет актуальный `master`.

### Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DOMAIN` | `portal.itk.academy` | Домен для health-check (`Host`-заголовок) |
| `GIT_BRANCH` | `master` | Ветка для прода |
| `APP_DIR` | `/var/www/inter-ca` | Рабочая копия репозитория |
| `HEALTHCHECK_URL` | `http://127.0.0.1/` | Локальный health-check (без зависимости от внешнего DNS) |
| `HEALTHCHECK_RETRIES` | `10` | Число попыток health-check |
| `HEALTHCHECK_DELAY` | `2` | Секунд между попытками |
| `RUN_LOCAL_API` | `0` | `1` — переустановить зависимости и перезапустить `api/` через pm2 |

Требования: скрипт нужно запускать от `root`, и на сервере уже должна быть готовая рабочая
копия `APP_DIR` (с `.git`) и nginx-конфиг (то есть `prod-init.sh` уже выполнялся).

## Откат (rollback)

Откат на предыдущий билд происходит автоматически внутри `prod-deploy.sh`, если:

- сборка не создала `build-new/index.html` или статику;
- `nginx -t` не прошёл после подмены билда;
- сайт не ответил `HTTP 200` после подмены (в пределах `HEALTHCHECK_RETRIES`).

Хранится только один предыдущий билд (`admin/build-old`) — откат возможен на один шаг назад.
Ручной откат вручную (если что-то пошло не так уже после успешного health-check скрипта):

```bash
ssh root@<VPS_IP>
cd /var/www/inter-ca/admin
rm -rf build && mv build-old build
nginx -t && systemctl reload nginx
```

Если нужно откатить дальше, чем на один билд назад, — код придётся собрать заново со старого
коммита вручную (`git checkout <sha>`, `npm ci`, `npm run build`), схема этого автоматически
не хранит.

## Проверка после деплоя

- Открыть `https://<DOMAIN>` в браузере и убедиться, что сайт грузится.
- Проверить, что `BACKEND_UPSTREAM` отвечает на нужные API-эндпоинты (например,
  `/api/mock-interview/ping`) — иначе фронт может загрузиться пустым.
- При `RUN_LOCAL_API=1` — проверить процесс: `pm2 status`, `pm2 logs`.
