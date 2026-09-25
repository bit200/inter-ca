'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { startService, portalOk, createJar, pkce, verifyJwtWithJwks, SEED_CLIENT, SERVICE_CLIENT } = require('./oidcHelpers');

test('дискавери объявляет оба сценария и JWKS для локальной проверки токенов', async () => {
    const svc = await startService();
    try {
        const meta = await (await fetch(`${svc.base}/.well-known/openid-configuration`)).json();
        assert.ok(meta.grant_types_supported.includes('authorization_code'));
        assert.ok(meta.grant_types_supported.includes('client_credentials'));
        assert.deepEqual(meta.code_challenge_methods_supported, ['S256'], 'PKCE только S256');
        assert.equal(meta.jwks_uri, `${svc.base}/jwks`);
        assert.ok(meta.id_token_signing_alg_values_supported.includes('RS256'));

        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        assert.equal(jwks.keys[0].alg, 'RS256');
        assert.equal(jwks.keys[0].d, undefined);
    } finally {
        await svc.stop();
    }
});

test('client credentials выдаёт JWT RS256, проверяемый по JWKS без обращения в SSO', async () => {
    const svc = await startService();
    try {
        const res = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: SERVICE_CLIENT.client_id,
                client_secret: SERVICE_CLIENT.client_secret,
                scope: 'mesh:read',
                resource: 'https://mesh.itk.academy',
            }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.token_type, 'Bearer');
        assert.ok(body.expires_in <= 900, 'access token короткий');

        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        const { ok, header, payload } = verifyJwtWithJwks(body.access_token, jwks);
        assert.equal(header.alg, 'RS256');
        assert.equal(ok, true, 'подпись сходится с публичным ключом из JWKS');
        assert.equal(payload.client_id, SERVICE_CLIENT.client_id);
        assert.equal(payload.aud, 'https://mesh.itk.academy', 'aud — запрошенный ресурс');
        assert.equal(payload.scope, 'mesh:read');
        assert.equal(payload.iss, svc.base);
        assert.equal(payload.sub, SERVICE_CLIENT.client_id, 'server-to-server токен без пользователя');
    } finally {
        await svc.stop();
    }
});

test('client credentials с чужим секретом не выдаёт токен', async () => {
    const svc = await startService();
    try {
        const res = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: SERVICE_CLIENT.client_id,
                client_secret: 'не тот секрет',
            }),
        });
        assert.equal(res.status, 401);
        assert.equal((await res.json()).error, 'invalid_client');
    } finally {
        await svc.stop();
    }
});

test('авторизация без PKCE отбивается', async () => {
    const svc = await startService();
    try {
        const url = `${svc.base}/auth?${new URLSearchParams({
            client_id: SEED_CLIENT.client_id,
            response_type: 'code',
            scope: 'openid profile',
            redirect_uri: SEED_CLIENT.redirect_uris[0],
            state: 'st',
        })}`;
        const res = await fetch(url, { redirect: 'manual' });
        const location = new URL(res.headers.get('location'), svc.base);
        assert.equal(location.searchParams.get('error'), 'invalid_request');
        assert.match(location.searchParams.get('error_description'), /PKCE/);
    } finally {
        await svc.stop();
    }
});

test('«Войти через ITK»: код + PKCE доводит до токенов, пароль проверяет itk-portal', async () => {
    const svc = await startService({
        portalHandler: portalOk({ userId: 'u-42', roles: ['hr', 'interviewer'], name: 'Иван Петров', email: 'ivan@itk.academy' }),
    });
    const jar = createJar();
    const { verifier, challenge } = pkce();

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
        const authUrl = `${svc.base}/auth?${new URLSearchParams({
            client_id: SEED_CLIENT.client_id,
            response_type: 'code',
            scope: 'openid profile email roles',
            redirect_uri: SEED_CLIENT.redirect_uris[0],
            state: 'st-1',
            code_challenge: challenge,
            code_challenge_method: 'S256',
        })}`;

        let res = await visit(authUrl);
        let location = new URL(res.headers.get('location'), svc.base);
        assert.match(location.pathname, /^\/interaction\//, 'без сессии сервис ведёт на экран входа');

        const loginPage = await visit(location.href);
        const html = await loginPage.text();
        assert.match(html, /Вход через ITK/);
        assert.match(html, /Mesh/, 'на экране видно, куда человек вернётся');

        const uid = location.pathname.split('/')[2];
        const bad = await visit(`${svc.base}/interaction/${uid}/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ login: 'ivan', password: 'x' }),
        });
        assert.equal(bad.status, 401);

        svc.calls.length = 0;
        res = await visit(`${svc.base}/interaction/${uid}/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ login: 'ivan', password: 'верный' }),
        });
        assert.equal(svc.calls[0].url, 'http://localhost:5553/internal/verify-credentials');
        assert.deepEqual(svc.calls[0].body, { login: 'ivan', password: 'верный' });

        // Дальше — согласие и возврат в приложение: ходим по редиректам, пока не вернёмся на redirect_uri.
        let code = null;
        for (let hop = 0; hop < 8 && !code; hop += 1) {
            location = new URL(res.headers.get('location'), svc.base);
            if (location.href.startsWith(SEED_CLIENT.redirect_uris[0])) {
                code = location.searchParams.get('code');
                assert.equal(location.searchParams.get('state'), 'st-1');
                break;
            }
            if (/^\/interaction\//.test(location.pathname)) {
                const consentUid = location.pathname.split('/')[2];
                const page = await visit(location.href);
                assert.match(await page.text(), /запрашивает доступ/);
                res = await visit(`${svc.base}/interaction/${consentUid}/confirm`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({}),
                });
            } else {
                res = await visit(location.href);
            }
        }
        assert.ok(code, 'авторизация должна вернуть код приложению');

        const tokenRes = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: SEED_CLIENT.redirect_uris[0],
                client_id: SEED_CLIENT.client_id,
                client_secret: SEED_CLIENT.client_secret,
                code_verifier: verifier,
            }),
        });
        assert.equal(tokenRes.status, 200);
        const tokens = await tokenRes.json();
        assert.ok(tokens.access_token && tokens.id_token);

        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        const access = verifyJwtWithJwks(tokens.access_token, jwks);
        assert.equal(access.ok, true);
        assert.equal(access.payload.sub, 'u-42');
        assert.deepEqual(access.payload.roles, ['hr', 'interviewer'], 'роли едут в access token');

        const id = verifyJwtWithJwks(tokens.id_token, jwks);
        assert.equal(id.ok, true);
        assert.equal(id.header.alg, 'RS256');
        assert.equal(id.payload.sub, 'u-42');
        assert.equal(id.payload.aud, SEED_CLIENT.client_id);
    } finally {
        await svc.stop();
    }
});

test('обмен кода с неверным code_verifier не проходит', async () => {
    const svc = await startService({ portalHandler: portalOk({ userId: 'u-42', roles: [] }) });
    try {
        const res = await fetch(`${svc.base}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: 'выдуманный-код',
                redirect_uri: SEED_CLIENT.redirect_uris[0],
                client_id: SEED_CLIENT.client_id,
                client_secret: SEED_CLIENT.client_secret,
                code_verifier: 'что-угодно-лишь-бы-длиннее-сорока-трёх-символов-ок',
            }),
        });
        assert.equal(res.status, 400);
        assert.equal((await res.json()).error, 'invalid_grant');
    } finally {
        await svc.stop();
    }
});

test('портал недоступен — человек видит это на экране входа, а не 500', async () => {
    const svc = await startService({
        portalHandler: async () => { throw new Error('ECONNREFUSED'); },
    });
    const jar = createJar();
    const { challenge } = pkce();
    try {
        const authUrl = `${svc.base}/auth?${new URLSearchParams({
            client_id: SEED_CLIENT.client_id,
            response_type: 'code',
            scope: 'openid',
            redirect_uri: SEED_CLIENT.redirect_uris[0],
            code_challenge: challenge,
            code_challenge_method: 'S256',
        })}`;
        const res = await fetch(authUrl, { redirect: 'manual' });
        jar.absorb(res);
        const uid = new URL(res.headers.get('location'), svc.base).pathname.split('/')[2];

        const post = await fetch(`${svc.base}/interaction/${uid}/login`, {
            method: 'POST',
            redirect: 'manual',
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
            body: new URLSearchParams({ login: 'ivan', password: 'x' }),
        });
        assert.equal(post.status, 502);
        assert.match(await post.text(), /Портал ITK сейчас не отвечает/);
    } finally {
        await svc.stop();
    }
});
