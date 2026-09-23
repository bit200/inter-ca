'use strict';

/**
 * Аккаунты живут в itk-portal. Единственная точка сопряжения —
 * POST /internal/verify-credentials: отдаём логин/пароль, получаем {userId, roles} либо 401.
 * Своей таблицы пользователей у itk-sso нет.
 */
function createAccountService({ portal, devUsers = [], fetchImpl = globalThis.fetch, profiles = createMemoryProfiles() } = {}) {
    const hasPortal = Boolean(portal && portal.baseUrl);
    if (!hasPortal && !devUsers.length) throw new Error('accounts: не задан адрес itk-portal');

    const verifyUrl = hasPortal
        ? `${portal.baseUrl.replace(/\/+$/, '')}${portal.verifyPath || '/internal/verify-credentials'}`
        : null;

    // Локальные учётки на случай, когда портала рядом нет: пока #1944 не поднят,
    // без них экран входа умеет только 502 (#1971).
    const local = new Map();
    for (const user of devUsers) local.set(user.login.toLowerCase(), user);

    /**
     * @returns {Promise<null|{accountId: string, roles: string[], claims: object}>}
     *          null — портал не признал пару логин/пароль (401).
     */
    async function verifyCredentials(login, password) {
        const dev = local.get(String(login).trim().toLowerCase());
        if (!verifyUrl) return dev && dev.password === password ? localAccount(dev) : null;

        try {
            return await askPortal(login, password);
        } catch (err) {
            // Портал не ответил. Настоящую учётку подменять нечем — ошибка идёт наверх,
            // а локальную из SSO_DEV_USERS проверяем сами: иначе стенд без #1944 умеет только 502.
            if (!dev) throw err;
            return dev.password === password ? localAccount(dev) : null;
        }
    }

    async function askPortal(login, password) {
        const headers = { 'content-type': 'application/json' };
        if (portal.token) headers.authorization = `Bearer ${portal.token}`;

        const signal = portal.timeoutMs ? AbortSignal.timeout(portal.timeoutMs) : undefined;
        const res = await fetchImpl(verifyUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ login, password }),
            signal,
        });

        if (res.status === 401 || res.status === 403) return null;
        if (!res.ok) throw new Error(`itk-portal verify-credentials: HTTP ${res.status}`);

        const body = await res.json();
        const userId = body && (body.userId || body.id || body._id);
        if (!userId) return null;

        return {
            accountId: String(userId),
            roles: Array.isArray(body.roles) ? body.roles : [],
            claims: body,
        };
    }

    /**
     * findAccount для node-oidc-provider: claims для id_token/userinfo.
     * Профиль кладём в сессию на логине, чтобы не дёргать портал на каждый запрос.
     */
    async function findAccount(ctx, sub) {
        const profile = (await profiles.get(sub)) || {};

        return {
            accountId: sub,
            async claims(_use, scope = '') {
                const scopes = new Set(String(scope).split(' ').filter(Boolean));
                const out = { sub };
                if (scopes.has('profile')) {
                    if (profile.name) out.name = profile.name;
                    if (profile.login) out.preferred_username = profile.login;
                }
                if (scopes.has('email') && profile.email) {
                    out.email = profile.email;
                    out.email_verified = Boolean(profile.emailVerified);
                }
                if (scopes.has('roles')) out.roles = profile.roles || [];
                return out;
            },
        };
    }

    return { verifyUrl, verifyCredentials, findAccount, profiles, devLogins: [...local.values()].map((u) => u.login) };
}

/** Учётка из SSO_DEV_USERS выглядит для провайдера так же, как ответ портала. */
function localAccount(user) {
    const claims = { userId: user.accountId, roles: user.roles };
    if (user.name) claims.name = user.name;
    if (user.email) {
        claims.email = user.email;
        claims.emailVerified = true;
    }
    return { accountId: user.accountId, roles: user.roles, claims };
}

/** Профили, снятые с портала на логине: чтобы не ходить туда на каждый claims(). */
function createMemoryProfiles() {
    const map = new Map();
    return {
        async get(accountId) {
            return map.get(accountId);
        },
        async set(accountId, profile) {
            map.set(accountId, profile);
        },
    };
}

module.exports = { createAccountService, createMemoryProfiles };
