'use strict';

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

    return {
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
        // Единственная точка сопряжения с itk-portal.
        portal: {
            baseUrl: env.ITK_PORTAL_URL || 'http://localhost:5553',
            verifyPath: env.ITK_PORTAL_VERIFY_PATH || '/internal/verify-credentials',
            token: env.ITK_PORTAL_INTERNAL_TOKEN || '',
            timeoutMs: int(env.ITK_PORTAL_TIMEOUT_MS, 5000),
        },
        // Ресурс по умолчанию для access token'ов (audience в JWT).
        resource: env.SSO_DEFAULT_RESOURCE || 'https://api.itk.academy',
        scopes: list(env.SSO_SCOPES, ['openid', 'profile', 'email', 'roles', 'offline_access']),
        resourceScopes: list(env.SSO_RESOURCE_SCOPES, ['mesh:read', 'mesh:write', 'evaluate:run', 'profile:read']),
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
        seedClients: parseSeedClients(env.SSO_SEED_CLIENTS),
    };
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

module.exports = { loadConfig };
