'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');
const { startService, portalOk, createJar, pkce } = require('./oidcHelpers');

/** Демо поднимается тем же способом, что и в жизни: клиент приходит из конфигурации. */
async function startDemo(env = {}) {
    // PORT здесь — только адрес в issuer и redirect_uri демо-клиента: слушает сервис всё равно случайный порт.
    const full = { PORT: '7545', SSO_COOKIE_KEYS: 'test-key', ...env };
    const config = loadConfig(full);
    return startService({
        env: full,
        clients: config.seedClients,
        portalHandler: portalOk({ userId: 'u-7', roles: ['hr'], name: 'Демо Пользователь', email: 'demo@itk.academy' }),
    });
}

test('демо-клиент заводится сам при локальном старте, в проде его нет', () => {
    const local = loadConfig({});
    assert.equal(local.demo.enabled, true);
    assert.equal(local.demo.redirectUri, 'http://localhost:7545/demo/callback');
    assert.equal(local.demo.scope, 'openid profile email roles offline_access');
    const seeded = local.seedClients.find((c) => c.client_id === local.demo.clientId);
    assert.ok(seeded, 'демо-клиент должен появиться в seedClients без SSO_SEED_CLIENTS');
    assert.deepEqual(seeded.redirect_uris, ['http://localhost:7545/demo/callback']);
    assert.equal(seeded.token_endpoint_auth_method, 'none', 'публичный клиент: секрета у страницы нет');
    assert.ok(seeded.grant_types.includes('refresh_token'));

    const prod = loadConfig({ NODE_ENV: 'production' });
    assert.equal(prod.demo.enabled, false, 'в проде демо выключено');
    assert.deepEqual(prod.seedClients, [], 'в проде демо-клиент не заводится');

    assert.equal(loadConfig({ NODE_ENV: 'production', SSO_DEMO: '1' }).demo.enabled, true, 'флаг включает демо явно');
    assert.equal(loadConfig({ SSO_DEMO: '0' }).demo.enabled, false, 'флаг выключает демо явно');
});

test('демо-клиент из окружения не задваивается', () => {
    const own = JSON.stringify([{ client_id: 'itk-demo', client_name: 'Свой', redirect_uris: ['http://localhost:1/cb'] }]);
    const config = loadConfig({ SSO_SEED_CLIENTS: own });
    assert.equal(config.seedClients.filter((c) => c.client_id === 'itk-demo').length, 1);
    assert.equal(config.seedClients[0].client_name, 'Свой', 'описание из окружения важнее автоматического');
});

test('страница /demo отдаёт кнопку «Войти через ITK» и свои статику', async () => {
    const svc = await startDemo();
    try {
        const res = await fetch(`${svc.base}/demo`);
        assert.equal(res.status, 200);
        const html = await res.text();
        assert.match(html, /Войти через ITK/);
        assert.match(html, /Обновить токен/);
        assert.match(html, /Выйти/);
        assert.match(html, /"clientId":"itk-demo"/, 'страница знает, каким client_id ходить в /auth');
        assert.match(html, /offline_access/);

        assert.equal((await fetch(`${svc.base}/demo/demo.css`)).status, 200);
        assert.match(await (await fetch(`${svc.base}/demo/demo.js`)).text(), /code_verifier/);

        // Возврат провайдера разбирает та же страница.
        assert.equal((await fetch(`${svc.base}/demo/callback?code=x&state=y`)).status, 200);
    } finally {
        await svc.stop();
    }
});

test('при выключенном демо страницы нет и клиент не заведён', async () => {
    const svc = await startDemo({ SSO_DEMO: '0' });
    try {
        assert.equal((await fetch(`${svc.base}/demo`)).status, 404);
        const auth = await fetch(`${svc.base}/auth?client_id=itk-demo&response_type=code&scope=openid`, { redirect: 'manual' });
        assert.equal(auth.status, 400, 'неизвестный client_id — провайдер отказывает');
    } finally {
        await svc.stop();
    }
});

test('демо-клиент проходит Authorization Code + PKCE до refresh и отзыва', async () => {
    const svc = await startDemo();
    const jar = createJar();
    const { verifier, challenge } = pkce();
    const redirectUri = 'http://localhost:7545/demo/callback';

    const visit = async (url, options = {}) => {
        const res = await fetch(url, {
            redirect: 'manual',
            ...options,
            headers: { cookie: jar.header(), ...(options.headers || {}) },
        });
        jar.absorb(res);
        return res;
    };

    try {
        let res = await visit(`${svc.base}/auth?${new URLSearchParams({
            client_id: 'itk-demo',
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: 'openid profile email roles offline_access',
            state: 'demo-state',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            prompt: 'consent',
        })}`);

        let code = null;
        for (let hop = 0; hop < 10 && !code; hop += 1) {
            const location = new URL(res.headers.get('location'), svc.base);
            if (location.href.startsWith(redirectUri)) {
                code = location.searchParams.get('code');
                assert.equal(location.searchParams.get('state'), 'demo-state');
                break;
            }
            if (/^\/interaction\//.test(location.pathname)) {
                const uid = location.pathname.split('/')[2];
                const page = await visit(location.href);
                const html = await page.text();
                if (/Вход через ITK/.test(html)) {
                    res = await visit(`${svc.base}/interaction/${uid}/login`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ login: 'demo', password: 'верный' }),
                    });
                } else {
                    res = await visit(`${svc.base}/interaction/${uid}/confirm`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({}),
                    });
                }
            } else {
                res = await visit(location.href);
            }
        }
        assert.ok(code, 'демо-клиент должен получить код');

        // Обмен идёт без секрета: публичный клиент доказывает себя code_verifier'ом.
        const tokenRes = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: 'itk-demo',
                code_verifier: verifier,
            }),
        });
        assert.equal(tokenRes.status, 200);
        const tokens = await tokenRes.json();
        assert.ok(tokens.id_token && tokens.access_token);
        assert.ok(tokens.refresh_token, 'offline_access со спрошенным согласием даёт refresh token');

        const refreshed = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh_token,
                client_id: 'itk-demo',
            }),
        });
        assert.equal(refreshed.status, 200, 'кнопка «Обновить токен» должна работать без секрета');
        const fresh = await refreshed.json();
        assert.ok(fresh.access_token);

        const revoked = await fetch(`${svc.base}/token/revocation`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                token: fresh.refresh_token || tokens.refresh_token,
                token_type_hint: 'refresh_token',
                client_id: 'itk-demo',
            }),
        });
        assert.equal(revoked.status, 200, 'кнопка «Выйти» отзывает refresh token');

        const afterLogout = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: fresh.refresh_token || tokens.refresh_token,
                client_id: 'itk-demo',
            }),
        });
        assert.equal(afterLogout.status, 400, 'после выхода обновить сессию нечем');
    } finally {
        await svc.stop();
    }
});
