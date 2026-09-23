# itk-sso

OAuth2/OIDC-сервис ITK на [node-oidc-provider](https://github.com/panva/node-oidc-provider).
Часть плана #17 «OAuth2/SSO-сервис для входа через ITK»: каркас сервиса (#1945),
реестр клиентов с админкой (#1946) и логаут через отзыв refresh token (#1947).

```
npm install --prefix itk-sso
npm test  --prefix itk-sso     # node --test test/*.test.js
npm start --prefix itk-sso     # сервис + админка реестра на /admin
```

## Что умеет каркас

| Сценарий | Зачем | Эндпоинты |
| --- | --- | --- |
| Authorization Code + PKCE (S256, обязателен) | «Войти через ITK» во внешней системе | `GET /auth`, `POST /token` |
| Client Credentials | server-to-server: mesh, evaluate | `POST /token` |
| Refresh token | продление доступа; отзыв = логаут | `POST /token`, `POST /token/revocation` |
| JWKS | проверка подписи на стороне потребителя, без обратных вызовов | `GET /jwks`, `GET /.well-known/jwks.json` |
| Экраны входа и согласия | форма логина и список запрошенных прав | `GET /interaction/:uid` |
| Админка реестра клиентов | CRUD клиентов и журнал токенов, вход по паролю | `GET /admin`, `/admin/api/*` |

Дискавери: `GET /.well-known/openid-configuration`. Здоровье: `GET /healthz`.

Access token и id_token — JWT RS256 с `aud` = `SSO_DEFAULT_RESOURCE`. Ресурс-сервер
скачивает JWKS один раз и дальше проверяет токены локально.

## Аккаунты

Своей таблицы пользователей нет. Пароль с экрана входа уходит одним запросом
`POST /internal/verify-credentials` на itk-portal (задача #1944), ответ — `{userId, roles}`
либо 401. В Mongo портала itk-sso не ходит. Роли из ответа едут в access token,
чтобы ресурс-сервер решал по JWT.

## База

Своя база под `clients` / токены / сессии: коллекции названы по моделям провайдера
(`Client`, `AccessToken`, `RefreshToken`, `Session`, `Grant`, `Interaction`, `AccountProfile`),
протухшее убирает TTL-индекс по `expiresAt`. Без `SSO_MONGO_URL` сервис поднимается
на хранилище в памяти (стенд, тесты). Реестр клиентов (#1946) пока держит свои
данные в JSON-файле — `ClientRegistry`/`TokenLog` принимают `store` в конструкторе,
так что переезд в ту же базу — это один класс с `read`/`write`/`update`.

## Запуск

```bash
npm install
cp .env.example .env     # как минимум задайте SSO_JWT_PRIVATE_KEY_FILE и SSO_COOKIE_KEYS
npm start
```

Ключ подписи:

```bash
mkdir -p keys && openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/sso-private.pem
```

Без ключа в окружении он генерируется на старте — выданные токены умрут вместе с процессом.

### Демо-вход на /demo

`http://localhost:7545/demo` — страница-«внешняя система» с кнопкой «Войти через ITK».
Она проходит настоящий Authorization Code + PKCE (state, `code_verifier`/S256, обмен
кода на `/token`) и показывает id_token и access_token расшифрованными, ответ `/me`,
срок жизни access token и refresh token. Кнопки «Обновить токен» и «Выйти» проверяют
refresh-grant и отзыв refresh (#1947).

Демо-клиент `itk-demo` (публичный, `redirect_uri = <issuer>/demo/callback`) заводится
сам при старте — заносить его в реестр руками не нужно. В проде демо выключено:
при `NODE_ENV=production` роутер не монтируется и клиент не создаётся, `SSO_DEMO=1`/`0`
включает и выключает его принудительно.

До #1944 (`POST /internal/verify-credentials` в itk-portal) логин проверять нечем —
поднимите заглушку на `ITK_PORTAL_URL`, отвечающую `{userId, roles}`.

`/me` на демо-странице отвечает 401: access token выписан на ресурс из
`SSO_DEFAULT_RESOURCE` (claim `aud`), а userinfo такие токены по спецификации не
принимает. Демо показывает этот ответ как есть с пояснением — профиль берётся из id_token.

## Деплой на отдельный VPS

Свой стек: `deploy.sh`, `docker-compose.yml`, `Dockerfile` и `.env` лежат здесь же.
От itk-platform-en/itk-portal деплой не зависит — сервис разворачивается на своей
машине, в compose поднимается и его собственная mongo.

```bash
cp .env.example .env    # SSO_ISSUER, SSO_COOKIE_KEYS, ITK_PORTAL_URL — обязательно
./deploy.sh
```

`deploy.sh` делает то же, что деплой соседних сервисов: `git pull` →
`docker compose up -d --build` → health-check → **откат на предыдущий коммит и
пересборка на нём**, если стек не ответил. Сам деплой при этом возвращает ненулевой
код, так что неудача не выглядит как успех.

Что стоит знать:

- **Health-check из трёх проверок**: `/healthz` (процесс и база), дискавери
  `/.well-known/openid-configuration` и `/.well-known/jwks.json`. Живой процесс без
  работающего OIDC — не деплой, а тишина, в которую внешние системы упрутся первым
  же запросом. Настраивается `HEALTHCHECK_RETRIES` / `HEALTHCHECK_DELAY`.
- **Ключ подписи заводится до первого запуска.** Если `SSO_JWT_PRIVATE_KEY_FILE`
  указывает в `./keys` и файла нет, скрипт сгенерирует RSA-2048 — иначе сервис
  сделает ключ сам в памяти и все выданные токены умрут при ближайшем рестарте.
  `./keys` и `./data` (реестр клиентов, журнал токенов) монтируются с хоста, поэтому
  переживают `--build`.
- **PORT один на всех**: и снаружи, и внутри контейнера, и в health-check. Скрипт
  экспортирует значение из `.env`, чтобы переменная шелла не увела контейнер на
  чужой порт.
- **Наружу — только loopback** (`SSO_BIND_ADDR`): issuer в OIDC обязан быть https,
  значит перед сервисом стоит nginx с сертификатом.

Клиенты для голого стенда (рабочий реестр — в админке):

```bash
SSO_SEED_CLIENTS='[{"client_id":"mesh-service","client_secret":"...","grant_types":["client_credentials"],"redirect_uris":[]}]' npm start
```

## Файлы

| файл | зачем |
| --- | --- |
| `src/provider.js` | конфигурация node-oidc-provider: grant types, PKCE, TTL, JWT-ресурсы |
| `src/adapter.js` | адаптер хранилища провайдера (find/consume/revokeByGrantId) |
| `src/db/` | хранилища: память и Mongo, один интерфейс |
| `src/accounts.js` | обращение к `/internal/verify-credentials` и claims для токенов |
| `src/interactions.js`, `src/views.js` | экраны входа и согласия |
| `src/keys.js` | ключ RS256 и публичный JWKS |
| `lib/clients.js`, `lib/tokenLog.js`, `lib/adminApi.js`, `public/` | реестр клиентов и админка (#1946) |
| `lib/refreshTokenStore.js`, `lib/logout.js`, `lib/accessTokenTtl.js` | логаут через отзыв refresh token (#1947) |
| `src/demo.js`, `public/demo.css`, `public/demo-client.js` | демо-«внешняя система» на `/demo` для локальной проверки входа (#1969) |
| `deploy.sh`, `docker-compose.yml`, `Dockerfile` | самостоятельный деплой на отдельный VPS (#1954) |

## Тесты

Покрыты: дискавери и JWKS, client credentials (в том числе чужой секрет), отказ
авторизации без PKCE, полный проход «Войти через ITK» с проверкой подписи токенов
публичным ключом, поведение при неверном пароле и при недоступном портале,
адаптер хранилища (сроки жизни, `consume`, `revokeByGrantId`), клиент портала,
согласованность деплоя (порт, пути health-check, откат) с самим сервисом,
а также реестр клиентов, журнал токенов и отзыв refresh на логауте, демо-страница
`/demo` (автозаведение клиента, выключение в проде, полный проход кода с PKCE,
refresh и отзыв без секрета).

---

# Реестр OAuth-клиентов

Кто вправе пускать людей в ITK через единый вход, что каждому из них разрешено
и что происходило с его токенами.

| файл | зачем |
| --- | --- |
| `lib/clients.js` | реестр: создание, правка, вкл/выкл, ротация секрета, проверка пары client_id/secret и допустимости grant/redirect_uri |
| `lib/tokenLog.js` | журнал событий токена: `issued` / `revoked` / `denied` |
| `lib/adminApi.js` | HTTP-ручки админки и раздача страницы |
| `lib/jsonStore.js` | хранилище: JSON-файл с атомарной записью |
| `lib/adminAuth.js` | замок админки: пароль, подписанная кука, вход и выход |
| `public/` | страницы админки и входа (ванильный JS) |

## Ручки

Смонтированы под `/admin`.

| метод | путь | что делает |
| --- | --- | --- |
| GET | `/admin/api/clients?enabled=&q=` | список со сводкой по токенам |
| POST | `/admin/api/clients` | завести клиента, секрет возвращается **один раз** |
| GET·PUT·DELETE | `/admin/api/clients/:id` | карточка, правка, удаление |
| POST | `/admin/api/clients/:id/secret` | перевыпустить секрет |
| GET | `/admin/api/token-log?clientId=&event=&subject=&limit=` | журнал, новые сверху |
| POST | `/admin/api/token-log` | записать событие (зовёт сервис выдачи токенов) |
| GET | `/admin/api/meta` | справочник grant types и известных scopes |
| POST | `/admin/login` | вход по паролю, в ответ — кука сессии |
| POST | `/admin/logout` | выйти: кука гасится |

## Решения, о которых стоит знать

- **Админка закрыта паролем.** `SSO_ADMIN_PASSWORD` из окружения; не задан —
  сервис придумывает случайный и печатает его в консоль при старте, публичной
  админка не бывает. После входа браузер носит подписанную HMAC куку на 12 часов,
  сессий на сервере нет. Без куки страница отдаёт экран входа, `/admin/api/*` — 401.
- **Секрет не хранится.** В реестре лежит scrypt-хеш с солью; строку видно только
  в ответе на создание и на ротацию. Забыли — перевыпускайте.
- **Выключенный клиент не пускают сразу.** `verifySecret` и `checkGrant` на
  `enabled: false` отвечают `disabled` до проверки секрета: выключили — значит
  доступ закрыт, а не «до истечения токена».
- **redirect_uri только https**, без `#`; `http` — исключение для `localhost`.
- **В журнал пишется jti, а не токен.** Журнал читают люди, он не должен
  становиться складом действующих ключей. Хвост старых событий отрезается
  (по умолчанию 5000 последних).
- **Отзывы с логаута попадают сюда через тот же журнал.** `logoutUser()` и
  `createRevokeHandler()` принимают хук `log` — если передать в него
  `e => tokenLog.revoked({clientId: e.clientId, subject: e.userId, ...})`,
  выход пользователя встанет в журнал рядом с выдачами.

---

# Логаут без back-channel push

Та часть, которая отвечает за завершение сессии: отзыв refresh token'ов и
короткий TTL access token.

## Как это работает

Внешняя система, вошедшая «через ITK», не обязана реализовывать logout-webhook.
Логаут на itk-portal не рассылается back-channel'ом — вместо этого:

1. Портал зовёт `POST /logout` в itk-sso с `userId` (опционально `clientId` /
   `sessionId`, чтобы выйти только на одном клиенте или устройстве).
2. itk-sso помечает все живые refresh token'ы пользователя отозванными.
3. Уже выданный access token продолжает проходить локальную проверку по JWKS,
   но живёт 5–15 минут. Обновить сессию внешняя система не сможет — refresh
   отозван, — поэтому теряет её в пределах TTL.

Ответ `POST /logout` возвращает `sessionEndsWithinSeconds` — верхнюю границу
этого окна.

## TTL access token

`resolveAccessTokenTtl()` зажимает значение из настроек в коридор 5–15 минут:
всё, что меньше, поднимается до 300 секунд, всё, что больше (и любой мусор) —
до 900 или до дефолтных 600. Вечных access token'ов при такой схеме логаута
быть не может, поэтому коридор зашит в код, а не только в конфиг.
`SSO_TTL_ACCESS` каркаса по умолчанию стоит в те же 900 секунд.

## Отзыв и ротация

`rotate()` на обмене refresh → access выдаёт новый токен и гасит предъявленный.
Токены одного логина связаны `familyId`: предъявление уже отозванного токена
считается либо гонкой, либо кражей и гасит всю цепочку — иначе отозванный на
логауте токен можно было бы пережить его потомком.

`POST /revoke` — RFC 7009: на неизвестный токен тоже отвечает 200, чтобы не
превращать эндпоинт в оракул существования токенов. У провайдера та же ручка
есть штатно на `POST /token/revocation`.
