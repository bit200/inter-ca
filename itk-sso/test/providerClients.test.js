'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { ClientRegistry } = require('../lib/clients');
const { TokenLog } = require('../lib/tokenLog');
const { startService, verifyJwtWithJwks } = require('./oidcHelpers');
const { tmpFile } = require('./helpers');

function registry() {
    return new ClientRegistry({ file: tmpFile('clients.json') });
}

function tokenLog() {
    return new TokenLog({ file: tmpFile('token-log.json') });
}

function createService(reg) {
    return reg.create({
        name: 'Mesh из админки',
        scopes: ['openid', 'mesh:read'],
        grantTypes: ['client_credentials'],
    });
}

async function requestToken(base, clientId, secret, extra = {}) {
    return fetch(`${base}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: secret,
            ...extra,
        }),
    });
}

test('клиент из реестра получает JWT, хотя его нет в SSO_SEED_CLIENTS', async () => {
    const reg = registry();
    const { client, secret } = createService(reg);
    const svc = await startService({ clients: [], registry: reg });
    try {
        const res = await requestToken(svc.base, client._id, secret, { scope: 'mesh:read' });
        assert.equal(res.status, 200, 'клиент из админки работает без перезапуска');
        const body = await res.json();

        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        const { ok, header, payload } = verifyJwtWithJwks(body.access_token, jwks);
        assert.equal(header.alg, 'RS256');
        assert.equal(ok, true, 'подпись сходится с публичным ключом из JWKS');
        assert.equal(payload.client_id, client._id);
        assert.equal(payload.sub, client._id);
    } finally {
        await svc.stop();
    }
});

test('выключенный в админке клиент токен не получает', async () => {
    const reg = registry();
    const { client, secret } = createService(reg);
    const svc = await startService({ clients: [], registry: reg });
    try {
        assert.equal((await requestToken(svc.base, client._id, secret)).status, 200);

        reg.setEnabled(client._id, false);
        const res = await requestToken(svc.base, client._id, secret);
        assert.equal(res.status, 401, 'выключили — доступ закрыт сразу');
        assert.equal((await res.json()).error, 'invalid_client');

        reg.setEnabled(client._id, true);
        assert.equal((await requestToken(svc.base, client._id, secret)).status, 200, 'включили обратно — снова работает');
    } finally {
        await svc.stop();
    }
});

test('ротация секрета и удаление клиента действуют без перезапуска', async () => {
    const reg = registry();
    const { client, secret } = createService(reg);
    const svc = await startService({ clients: [], registry: reg });
    try {
        const rotated = reg.rotateSecret(client._id);
        assert.equal((await requestToken(svc.base, client._id, secret)).status, 401, 'старый секрет больше не годится');
        assert.equal((await requestToken(svc.base, client._id, rotated.secret)).status, 200, 'новый секрет работает сразу');

        reg.remove(client._id);
        assert.equal((await requestToken(svc.base, client._id, rotated.secret)).status, 401, 'удалённого клиента провайдер не знает');
    } finally {
        await svc.stop();
    }
});

test('подставленный отпечаток секрета из реестра паролем не является', async () => {
    const reg = registry();
    const { client } = createService(reg);
    const svc = await startService({ clients: [], registry: reg });
    try {
        const raw = reg.getRaw(client._id);
        const res = await requestToken(svc.base, client._id, `registry$${raw.secretHash}`);
        assert.equal(res.status, 401, 'хеш секрета не пускает: проверку делает реестр');
    } finally {
        await svc.stop();
    }
});

test('клиент из реестра ограничен своими grant types и redirect_uri', async () => {
    const reg = registry();
    const { client, secret } = createService(reg);
    const svc = await startService({ clients: [], registry: reg });
    try {
        const res = await requestToken(svc.base, client._id, secret, { grant_type: 'authorization_code', code: 'x' });
        assert.equal(res.status, 400);
        assert.match((await res.json()).error_description, /grant type is not allowed/, 'client_credentials-клиенту код менять не на что');

        const web = reg.create({
            name: 'Портал',
            scopes: ['openid', 'profile'],
            grantTypes: ['authorization_code'],
            redirectUris: ['https://portal.example.org/callback'],
        });
        const auth = await fetch(`${svc.base}/auth?${new URLSearchParams({
            client_id: web.client._id,
            response_type: 'code',
            scope: 'openid',
            redirect_uri: 'https://чужой.example.org/callback',
            code_challenge: 'x'.repeat(43),
            code_challenge_method: 'S256',
        })}`, { redirect: 'manual' });
        const body = await auth.json();
        assert.equal(body.error, 'invalid_redirect_uri', 'адрес возврата берётся из реестра');
    } finally {
        await svc.stop();
    }
});

test('выдача и отказ пишутся в журнал токенов сами, без POST /admin/api/token-log', async () => {
    const reg = registry();
    const log = tokenLog();
    const { client, secret } = createService(reg);
    const svc = await startService({ clients: [], registry: reg, tokenLog: log });
    try {
        await requestToken(svc.base, client._id, secret, { scope: 'mesh:read', resource: 'https://mesh.itk.academy' });
        const issued = log.list({ event: 'issued' });
        assert.equal(issued.length, 1);
        assert.equal(issued[0].clientId, client._id);
        assert.equal(issued[0].clientName, 'Mesh из админки');
        assert.equal(issued[0].grantType, 'client_credentials');
        assert.deepEqual(issued[0].scopes, ['mesh:read']);
        assert.ok(issued[0].jti, 'в журнал идёт jti, а не сам токен');

        await requestToken(svc.base, client._id, 'не тот секрет');
        const denied = log.list({ event: 'denied' });
        assert.equal(denied.length, 1);
        assert.equal(denied[0].clientId, client._id);
        assert.ok(denied[0].reason, 'у отказа есть причина');
    } finally {
        await svc.stop();
    }
});

// ── подключение внешней системы через админку: ресурсы, согласие, отзыв ──

const { createJar, pkce, portalOk } = require('./oidcHelpers');

const EXTERNAL_API = 'https://external-api.itk.academy';
const PERSON = { userId: 'u-7', roles: ['candidate'], name: 'Анна' };

function createWebSystem(reg, extra = {}) {
    return reg.create({
        name: 'Партнёрская HR-система',
        kind: 'login',
        redirectUris: ['https://hr.partner.example/callback'],
        scopes: ['openid', 'profile', 'offline_access'],
        resources: { 'external-api': ['mock:read', 'score:read'] },
        ...extra,
    });
}

/**
 * «Войти через ITK» глазами браузера: вход, при необходимости — согласие, код, обмен на токены.
 * Возвращает токены и то, показывали ли человеку экран согласия.
 */
async function signIn(svc, client, secret, { scope = 'openid profile offline_access mock:read', agree = true } = {}) {
    const jar = createJar();
    const { verifier, challenge } = pkce();
    const redirectUri = client.redirectUris[0];
    const visit = async (url, options = {}) => {
        const res = await fetch(url, { redirect: 'manual', ...options, headers: { cookie: jar.header(), ...(options.headers || {}) } });
        jar.absorb(res);
        return res;
    };
    const form = (body) => ({
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
    });

    let res = await visit(`${svc.base}/auth?${new URLSearchParams({
        client_id: client._id,
        response_type: 'code',
        scope,
        prompt: 'consent',
        resource: EXTERNAL_API,
        redirect_uri: redirectUri,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    })}`);
    let location = new URL(res.headers.get('location'), svc.base);
    const uid = location.pathname.split('/')[2];
    res = await visit(`${svc.base}/interaction/${uid}/login`, form({ login: 'anna', password: 'верный' }));

    let consentPage = null;
    let code = null;
    for (let hop = 0; hop < 8 && !code; hop += 1) {
        location = new URL(res.headers.get('location'), svc.base);
        if (location.href.startsWith(redirectUri)) {
            code = location.searchParams.get('code');
            break;
        }
        if (/^\/interaction\//.test(location.pathname)) {
            const consentUid = location.pathname.split('/')[2];
            consentPage = await (await visit(location.href)).text();
            if (!agree) return { consentPage };
            res = await visit(`${svc.base}/interaction/${consentUid}/confirm`, form({}));
        } else {
            res = await visit(location.href);
        }
    }
    assert.ok(code, 'вход должен вернуть код системе');

    const tokenRes = await fetch(`${svc.base}/token`, form({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: client._id,
        client_secret: secret,
        code_verifier: verifier,
    }));
    assert.equal(tokenRes.status, 200);
    return { consentPage, tokens: await tokenRes.json() };
}

async function refresh(svc, clientId, secret, refreshToken) {
    return fetch(`${svc.base}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: secret }),
    });
}

test('сторонней системе человек даёт согласие на экране, где названы его мок-интервью и оценки', async () => {
    const reg = registry();
    const { client, secret } = createWebSystem(reg, { owner: 'ООО Партнёр' });
    const svc = await startService({ clients: [], registry: reg, portalHandler: portalOk(PERSON) });
    try {
        const { consentPage } = await signIn(svc, client, secret, { scope: 'openid profile mock:read score:read', agree: false });
        assert.ok(consentPage, 'третьей стороне без согласия данные не отдаём');
        assert.match(consentPage, /Партнёрская HR-система запрашивает доступ/);
        assert.match(consentPage, /мок-интервью/i);
        assert.match(consentPage, /оценк/i);
        assert.match(consentPage, /ООО Партнёр/, 'видно, чья это система');
    } finally {
        await svc.stop();
    }
});

test('наша внутренняя (first-party) система входит без экрана согласия', async () => {
    const reg = registry();
    const { client, secret } = createWebSystem(reg, { name: 'Портал ITK', firstParty: true });
    const svc = await startService({ clients: [], registry: reg, portalHandler: portalOk(PERSON) });
    try {
        const { consentPage, tokens } = await signIn(svc, client, secret);
        assert.equal(consentPage, null, 'согласие для своих не спрашиваем');
        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        const access = verifyJwtWithJwks(tokens.access_token, jwks);
        assert.equal(access.payload.sub, 'u-7');
        assert.equal(access.payload.aud, EXTERNAL_API);
        assert.match(access.payload.scope, /mock:read/, 'ресурсный scope выдан без согласия');
        assert.ok(tokens.refresh_token);
    } finally {
        await svc.stop();
    }
});

test('выключение клиента гасит его refresh token\'ы: после обратного включения они не оживают', async () => {
    const reg = registry();
    const log = tokenLog();
    const { client, secret } = createWebSystem(reg, { firstParty: true });
    const svc = await startService({ clients: [], registry: reg, tokenLog: log, portalHandler: portalOk(PERSON) });
    try {
        const { tokens } = await signIn(svc, client, secret);
        const first = await refresh(svc, client._id, secret, tokens.refresh_token);
        assert.equal(first.status, 200, 'пока клиент включён, refresh работает');
        const rotated = (await first.json()).refresh_token || tokens.refresh_token;

        reg.setEnabled(client._id, false);
        await svc.revocation.settled();
        assert.equal((await refresh(svc, client._id, secret, rotated)).status, 401, 'выключенный клиент не обновляет доступ');

        reg.setEnabled(client._id, true);
        const revived = await refresh(svc, client._id, secret, rotated);
        assert.equal(revived.status, 400);
        assert.equal((await revived.json()).error, 'invalid_grant', 'refresh, выданный до выключения, погашен');

        const revokedRows = log.list({ event: 'revoked', clientId: client._id });
        assert.ok(revokedRows.some((e) => /выключен/.test(e.reason)), 'отзыв виден в журнале токенов');
    } finally {
        await svc.stop();
    }
});

test('удаление клиента гасит его refresh token\'ы в хранилище', async () => {
    const reg = registry();
    const { client, secret } = createWebSystem(reg, { firstParty: true });
    const svc = await startService({ clients: [], registry: reg, portalHandler: portalOk(PERSON) });
    try {
        await signIn(svc, client, secret);
        const before = (await svc.store.list('RefreshToken')).filter((t) => t.clientId === client._id);
        assert.equal(before.length, 1);
        reg.remove(client._id);
        await svc.revocation.settled();
        const after = (await svc.store.list('RefreshToken')).filter((t) => t.clientId === client._id);
        assert.equal(after.length, 0);
    } finally {
        await svc.stop();
    }
});
