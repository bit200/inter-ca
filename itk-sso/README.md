# itk-sso

OAuth2/OIDC-сервис ITK на [node-oidc-provider](https://github.com/panva/node-oidc-provider).
Каркас: два сценария выдачи токенов, свои ключи RS256 и своя база.

## Что умеет

| Сценарий | Зачем | Эндпоинты |
| --- | --- | --- |
| Authorization Code + PKCE (S256, обязателен) | «Войти через ITK» во внешней системе | `GET /auth`, `POST /token` |
| Client Credentials | server-to-server: mesh, evaluate | `POST /token` |
| Refresh token | продление доступа; отзыв = логаут (#1947) | `POST /token`, `POST /token/revocation` |
| JWKS | проверка подписи на стороне потребителя, без обратных вызовов | `GET /jwks`, `GET /.well-known/jwks.json` |

Дискавери: `GET /.well-known/openid-configuration`. Здоровье: `GET /healthz`.

Access token и id_token — JWT RS256 с `aud` = `SSO_DEFAULT_RESOURCE`. Ресурс-сервер
скачивает JWKS один раз и дальше проверяет токены локально.

## Аккаунты

Своей таблицы пользователей нет. Пароль с экрана входа уходит одним запросом
`POST /internal/verify-credentials` на itk-portal (задача #1944), ответ — `{userId, roles}`
либо 401. В Mongo портала itk-sso не ходит.

## База

Своя база под `clients` / токены / сессии: коллекции названы по моделям провайдера
(`Client`, `AccessToken`, `RefreshToken`, `Session`, `Grant`, `Interaction`, `AccountProfile`),
протухшее убирает TTL-индекс по `expiresAt`. Реестр клиентов из #1946 пишет в ту же
коллекцию `Client` — провайдер подхватывает изменения без перезапуска.
Без `SSO_MONGO_URL` сервис поднимается на хранилище в памяти (стенд, тесты).

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

## Клиенты для стенда

```bash
SSO_SEED_CLIENTS='[{"client_id":"mesh-service","client_secret":"...","grant_types":["client_credentials"],"redirect_uris":[]}]' npm start
```

## Тесты

```bash
npm test
```

Покрыты: дискавери и JWKS, client credentials (в том числе чужой секрет), отказ
авторизации без PKCE, полный проход «Войти через ITK» с проверкой подписи токенов
публичным ключом, поведение при неверном пароле и при недоступном портале,
адаптер хранилища (сроки жизни, `consume`, `revokeByGrantId`) и клиент портала.
