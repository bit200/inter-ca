'use strict';

/**
 * Что реально применилось из окружения. Нужен на демо-странице: на стенде правят .env,
 * перезапускают сервис — и хотят увидеть глазами, доехала правка или нет.
 *
 * Считается там же, где окружение читается (config.js), и сразу в безопасном виде:
 * секреты сюда попадают только словами «задан»/«не задан», значений у них нет.
 */

function secs(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (n >= 86400 && n % 86400 === 0) return `${n} с (${n / 86400} дн)`;
    if (n >= 3600 && n % 3600 === 0) return `${n} с (${n / 3600} ч)`;
    // Минуту подписывать нечем: «60 с (1 мин)» ничего не добавляет.
    if (n > 60 && n % 60 === 0) return `${n} с (${n / 60} мин)`;
    return `${n} с`;
}

/** Адрес базы показываем без логина и пароля: mongodb://user:pass@host → mongodb://***@host. */
function maskUrl(url) {
    return String(url == null ? '' : url).replace(/\/\/[^/@]*@/, '//***@');
}

function flag(on) {
    return on ? 'включено' : 'выключено';
}

/**
 * @param {object} env исходное окружение (то же, из которого собран config)
 * @param {object} config результат loadConfig — показываем применённое значение, а не сырую строку
 * @returns {Array<{title: string, note?: string, vars: Array<{name, value, fromEnv, secret}>}>}
 */
function buildEnvReport(env, config) {
    const has = (name) => env[name] != null && String(env[name]) !== '';
    const row = (name, value) => ({ name, value: String(value), fromEnv: has(name), secret: false });
    const secret = (name, value) => ({
        name,
        value: value == null || value === '' ? 'не задан' : 'задан',
        fromEnv: has(name),
        secret: true,
    });

    const devUsers = (config.devAccounts && config.devAccounts.users) || [];

    return [
        {
            title: 'Адрес и режим',
            vars: [
                row('NODE_ENV', env.NODE_ENV || 'не задан — значит, стенд'),
                row('PORT', config.port),
                row('SSO_ISSUER', config.issuer),
            ],
        },
        {
            title: 'Демо-страница',
            note: 'Эти значения страница и подставляет, когда идёт в /auth.',
            vars: [
                row('SSO_DEMO', flag(config.demo.enabled)),
                row('SSO_DEMO_CLIENT_ID', config.demo.clientId),
                row('SSO_DEMO_CLIENT_NAME', config.demo.clientName),
                row('SSO_DEMO_REDIRECT_URI', config.demo.redirectUri),
                row('SSO_DEMO_SCOPE', config.demo.scope),
            ],
        },
        {
            title: 'Портал ITK',
            vars: [
                row('ITK_PORTAL_URL', config.portal.baseUrl || 'не задан — вход идёт локальными учётками'),
                row('ITK_PORTAL_VERIFY_PATH', config.portal.verifyPath),
                secret('ITK_PORTAL_INTERNAL_TOKEN', config.portal.token),
                row('ITK_PORTAL_TIMEOUT_MS', `${config.portal.timeoutMs} мс`),
            ],
        },
        {
            title: 'Локальные учётки',
            note: 'Пароли не показываем даже здесь — только логины, которыми можно войти.',
            vars: [
                row('SSO_DEV_ACCOUNTS', flag(config.devAccounts && config.devAccounts.enabled)),
                {
                    name: 'SSO_DEV_USERS',
                    value: devUsers.length ? devUsers.map((u) => u.login).join(', ') : 'учёток нет',
                    fromEnv: has('SSO_DEV_USERS'),
                    secret: true,
                },
            ],
        },
        {
            title: 'Время жизни токенов',
            vars: [
                row('SSO_TTL_ACCESS', secs(config.ttl.accessToken)),
                row('SSO_TTL_REFRESH', secs(config.ttl.refreshToken)),
                row('SSO_TTL_ID', secs(config.ttl.idToken)),
                row('SSO_TTL_CODE', secs(config.ttl.authorizationCode)),
                row('SSO_TTL_SESSION', secs(config.ttl.session)),
                row('SSO_TTL_CLIENT_CREDENTIALS', secs(config.ttl.clientCredentials)),
            ],
        },
        {
            title: 'Ресурс и scope',
            vars: [
                row('SSO_DEFAULT_RESOURCE', config.resource),
                row('SSO_SCOPES', config.scopes.join(' ')),
                row('SSO_RESOURCE_SCOPES', config.resourceScopes.join(' ')),
            ],
        },
        {
            title: 'Хранилище и ключи',
            vars: [
                row('SSO_DB_DRIVER', config.db.driver),
                { ...row('SSO_MONGO_URL', maskUrl(config.db.url)), secret: true },
                row('SSO_MONGO_DB', config.db.name),
                secret('SSO_JWT_PRIVATE_KEY', config.keys.privateKeyPem),
                row('SSO_JWT_PRIVATE_KEY_FILE', config.keys.privateKeyFile || 'не задан — ключ генерируется на старте'),
                row('SSO_JWT_KID', config.keys.kid),
            ],
        },
        {
            title: 'Клиенты и секреты сервиса',
            vars: [
                row('SSO_SEED_CLIENTS', `${config.seedClients.length} шт.`),
                secret('SSO_COOKIE_KEYS', config.cookieKeys.join('')),
                secret('SSO_ADMIN_PASSWORD', env.SSO_ADMIN_PASSWORD),
                secret('SSO_ADMIN_SECRET', env.SSO_ADMIN_SECRET),
            ],
        },
    ];
}

module.exports = { buildEnvReport, maskUrl, secs };
