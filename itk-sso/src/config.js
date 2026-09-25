'use strict';

const { buildEnvReport } = require('./envReport');
const { loadResources } = require('../lib/resources');

/**
 * Конфигурация itk-sso. Всё читается из окружения, дефолты рассчитаны на локальную разработку.
 */
function int(value, fallback) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
}

function list(value, fallback) {
    if (!value) return fallback;
    return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

function loadConfig(env = process.env) {
    const port = int(env.PORT, 7545);
    const issuer = env.SSO_ISSUER || `http://localhost:${port}`;
    const demo = loadDemo(env, issuer);

    const config = {
        port,
        issuer,
        // Хранилище clients/tokens/sessions: своя база sso, а не база itk-portal.
        db: {
            driver: env.SSO_DB_DRIVER || (env.SSO_MONGO_URL ? 'mongo' : 'memory'),
            url: env.SSO_MONGO_URL || 'mongodb://127.0.0.1:27017',
            name: env.SSO_MONGO_DB || 'itk_sso',
        },
        // Ключи подписи RS256: приватный ключ в PEM, публичная часть уходит в JWKS.
        keys: {
            privateKeyPem: env.SSO_JWT_PRIVATE_KEY || null,
            privateKeyFile: env.SSO_JWT_PRIVATE_KEY_FILE || null,
            kid: env.SSO_JWT_KID || 'itk-sso-1',
        },
        // Единственная точка сопряжения с itk-portal. Адрес не угадываем: раньше здесь
        // дефолтом стоял http://localhost:5553, но на этом порту живёт api aquagor, а не
        // портал — он отвечал 404 на /internal/verify-credentials, и любой вход падал с
        // «Портал ITK сейчас не отвечает: ответил 404». Адреса в окружении нет — портала
        // нет вовсе, и вход идёт локальными учётками (SSO_DEV_USERS).
        portal: {
            baseUrl: env.ITK_PORTAL_URL || '',
            verifyPath: env.ITK_PORTAL_VERIFY_PATH || '/internal/verify-credentials',
            token: env.ITK_PORTAL_INTERNAL_TOKEN || '',
            timeoutMs: int(env.ITK_PORTAL_TIMEOUT_MS, 5000),
        },
        // Ресурс по умолчанию для access token'ов (audience в JWT), когда клиент не
        // передал resource=. Сервисных scope'ов у него нет: evaluate, mesh и
        // external-api — отдельные ресурсы со своим aud (см. resources ниже).
        resource: env.SSO_DEFAULT_RESOURCE || 'https://api.itk.academy',
        scopes: list(env.SSO_SCOPES, ['openid', 'profile', 'email', 'roles', 'offline_access']),
        resourceScopes: list(env.SSO_RESOURCE_SCOPES, ['profile:read']),
        // Ресурсы сервисов: evaluate, mesh, external-api (lib/resources.js).
        resources: loadResources(env),
        ttl: {
            // Короткий access token: логаут = отзыв refresh, доступ протухает сам (см. #1947).
            accessToken: int(env.SSO_TTL_ACCESS, 15 * 60),
            refreshToken: int(env.SSO_TTL_REFRESH, 14 * 24 * 3600),
            authorizationCode: int(env.SSO_TTL_CODE, 60),
            idToken: int(env.SSO_TTL_ID, 15 * 60),
            session: int(env.SSO_TTL_SESSION, 14 * 24 * 3600),
            interaction: int(env.SSO_TTL_INTERACTION, 3600),
            grant: int(env.SSO_TTL_GRANT, 14 * 24 * 3600),
            clientCredentials: int(env.SSO_TTL_CLIENT_CREDENTIALS, 15 * 60),
        },
        cookieKeys: list(env.SSO_COOKIE_KEYS, ['itk-sso-dev-cookie-key']),
        // Клиенты из окружения нужны только на голом стенде; рабочий реестр живёт в БД (см. #1946).
        seedClients: withDemoClient(parseSeedClients(env.SSO_SEED_CLIENTS), demo),
        demo,
        // Учётки внутри самого itk-sso: itk-portal (#1944) ещё не поднят, и без них
        // любой вход на локальном стенде упирается в 502 от verify-credentials (#1971).
        devAccounts: loadDevAccounts(env),
    };

    // Демо-страница показывает применённое окружение (#1998): считаем его здесь,
    // где env и читается, — и сразу без секретов, наружу уходит только «задан/не задан».
    config.envReport = buildEnvReport(env, config);
    return config;
}

const DEV_ACCOUNT_DEFAULT = 'demo:demo';

/**
 * Локальные аккаунты для проверки входа без itk-portal. Включены там же, где демо-клиент:
 * вне production. Формат SSO_DEV_USERS — «логин:пароль» через запятую либо JSON-массив.
 */
function loadDevAccounts(env) {
    const enabled = env.SSO_DEV_ACCOUNTS == null
        ? env.NODE_ENV !== 'production'
        : /^(1|true|on|yes|да)$/i.test(String(env.SSO_DEV_ACCOUNTS));
    if (!enabled) return { enabled: false, users: [] };
    return { enabled: true, users: parseDevUsers(env.SSO_DEV_USERS || DEV_ACCOUNT_DEFAULT) };
}

function parseDevUsers(raw) {
    const text = String(raw).trim();
    const list = text.startsWith('[') || text.startsWith('{')
        ? [].concat(JSON.parse(text))
        : text.split(',').map((pair) => {
            const [login, password] = pair.split(':');
            return { login, password };
        });

    return list
        .map((user) => ({
            login: String((user && (user.login || user.username)) || '').trim(),
            password: String((user && user.password) || ''),
            accountId: String((user && (user.accountId || user.userId)) || '').trim(),
            roles: Array.isArray(user && user.roles) ? user.roles : [],
            name: (user && user.name) || '',
            email: (user && user.email) || '',
        }))
        .filter((user) => user.login && user.password)
        .map((user) => ({ ...user, accountId: user.accountId || `dev-${user.login}` }));
}

/**
 * Демо-«внешняя система» на /demo: локальная проверка Authorization Code + PKCE
 * без чужого клиента. В проде выключена — SSO_DEMO=0 либо NODE_ENV=production.
 */
function loadDemo(env, issuer) {
    const enabled = env.SSO_DEMO == null
        ? env.NODE_ENV !== 'production'
        : /^(1|true|on|yes|да)$/i.test(String(env.SSO_DEMO));
    const clientId = env.SSO_DEMO_CLIENT_ID || 'itk-demo';
    return {
        enabled,
        clientId,
        clientName: env.SSO_DEMO_CLIENT_NAME || 'Демо-приложение ITK',
        redirectUri: env.SSO_DEMO_REDIRECT_URI || `${issuer}/demo/callback`,
        scope: env.SSO_DEMO_SCOPE || 'openid profile email roles offline_access',
    };
}

/** Демо-клиент заводится сам при локальном старте: руками в реестр его добавлять не нужно. */
function demoClient(demo) {
    return {
        client_id: demo.clientId,
        client_name: demo.clientName,
        redirect_uris: [demo.redirectUri],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        // Публичный клиент: секрета у страницы в браузере быть не может, за неё отвечает PKCE.
        token_endpoint_auth_method: 'none',
    };
}

function withDemoClient(clients, demo) {
    if (!demo.enabled) return clients;
    if (clients.some((c) => c && (c.client_id || c.clientId) === demo.clientId)) return clients;
    return [...clients, demoClient(demo)];
}

function parseSeedClients(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
        throw new Error(`SSO_SEED_CLIENTS: не разобрался JSON (${err.message})`);
    }
}

module.exports = { loadConfig, loadDemo, loadDevAccounts, demoClient };
