'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');
const { createAccountService } = require('../src/accounts');
const { startService, createJar, pkce, SEED_CLIENT } = require('./oidcHelpers');

const DEV_USER = { login: 'demo', password: 'demo', accountId: 'dev-demo', roles: [], name: '', email: '' };
const portal = { baseUrl: 'http://portal.local', verifyPath: '/internal/verify-credentials', timeoutMs: 0 };

test('конфиг: локальные учётки есть на стенде и выключены в проде', () => {
    const local = loadConfig({}).devAccounts;
    assert.equal(local.enabled, true);
    assert.deepEqual(local.users.map((u) => u.login), ['demo']);
    assert.equal(local.users[0].accountId, 'dev-demo');

    assert.equal(loadConfig({ NODE_ENV: 'production' }).devAccounts.enabled, false);
    assert.equal(loadConfig({ SSO_DEV_ACCOUNTS: '0' }).devAccounts.enabled, false);

    const custom = loadConfig({ SSO_DEV_USERS: 'ivan:secret,olga:pass' }).devAccounts.users;
    assert.deepEqual(custom.map((u) => u.login), ['ivan', 'olga']);
    assert.equal(custom[0].password, 'secret');
});

test('аккаунты: портал недоступен — локальная учётка пускает, чужой логин по-прежнему сбой', async () => {
    const svc = createAccountService({
        portal,
        devUsers: [DEV_USER],
        fetchImpl: async () => { throw new Error('fetch failed'); },
    });

    const account = await svc.verifyCredentials('Demo', 'demo');
    assert.equal(account.accountId, 'dev-demo');
    assert.equal(await svc.verifyCredentials('demo', 'не тот'), null, 'пароль локальной учётки тоже проверяется');
    await assert.rejects(() => svc.verifyCredentials('ivan', 'secret'), /fetch failed/);
});

test('аккаунты: живой портал главнее локальных учёток — своя запись его не подменяет', async () => {
    const svc = createAccountService({
        portal,
        devUsers: [DEV_USER],
        fetchImpl: async () => new Response(JSON.stringify({ userId: 'u-7', roles: ['hr'] }), {
            status: 200, headers: { 'content-type': 'application/json' },
        }),
    });

    assert.equal((await svc.verifyCredentials('demo', 'портальный')).accountId, 'u-7');
});

test('вход: без itk-portal локальная учётка доходит до кода, а не до 502', async () => {
    const svc = await startService({ portalHandler: async () => { throw new Error('ECONNREFUSED'); } });
    const jar = createJar();
    const { challenge } = pkce();
    const visit = (url, options = {}) => fetch(url, {
        redirect: 'manual',
        ...options,
        headers: { ...(options.headers || {}), cookie: jar.header() },
    }).then((res) => { jar.absorb(res); return res; });

    try {
        let res = await visit(`${svc.base}/auth?${new URLSearchParams({
            client_id: SEED_CLIENT.client_id,
            response_type: 'code',
            scope: 'openid',
            redirect_uri: SEED_CLIENT.redirect_uris[0],
            code_challenge: challenge,
            code_challenge_method: 'S256',
        })}`);

        const uid = new URL(res.headers.get('location'), svc.base).pathname.split('/')[2];

        // Логина, которого нет в SSO_DEV_USERS, портал подтвердить не может: 502 с причиной и подсказкой.
        const denied = await visit(`${svc.base}/interaction/${uid}/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ login: 'ivan', password: 'x' }),
        });
        assert.equal(denied.status, 502);
        const html = await denied.text();
        assert.match(html, /Портал ITK сейчас не отвечает/);
        assert.match(html, /локальной учётной записью demo/, 'на экране сказано, чем войти без портала');

        res = await visit(`${svc.base}/interaction/${uid}/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ login: 'demo', password: 'demo' }),
        });
        assert.equal(res.status, 303, 'локальная учётка проходит вход');

        let code = null;
        for (let hop = 0; hop < 8 && !code; hop += 1) {
            const location = new URL(res.headers.get('location'), svc.base);
            if (location.href.startsWith(SEED_CLIENT.redirect_uris[0])) {
                code = location.searchParams.get('code');
                break;
            }
            if (/^\/interaction\//.test(location.pathname)) {
                res = await visit(`${svc.base}/interaction/${location.pathname.split('/')[2]}/confirm`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({}),
                });
            } else {
                res = await visit(location.href);
            }
        }
        assert.ok(code, 'вход локальной учётной записью доводит до кода авторизации');
    } finally {
        await svc.stop();
    }
});
