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
