'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { ClientRegistry } = require('../lib/clients');
const { loadResources } = require('../lib/resources');
const { startService, verifyJwtWithJwks } = require('./oidcHelpers');
const { tmpFile } = require('./helpers');

const RES = Object.fromEntries(loadResources({}).map((r) => [r.key, r.audience]));

async function requestToken(base, clientId, secret, extra = {}) {
    return fetch(`${base}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret, ...extra }),
    });
}

/** Так проверяет токен ресурс-сервер: подпись по JWKS и aud — свой. */
function acceptedBy(audience, token, jwks) {
    const { ok, payload } = verifyJwtWithJwks(token, jwks);
    const aud = [].concat(payload.aud);
    return ok && aud.includes(audience);
}

async function withService(resources, fn) {
    const reg = new ClientRegistry({ file: tmpFile('clients.json') });
    const { client, secret } = reg.create({ name: 'Evaluate worker', scopes: ['openid'], grantTypes: ['client_credentials'], resources });
    const svc = await startService({ clients: [], registry: reg });
    try {
        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        await fn({ svc, jwks, reg, id: client._id, secret });
    } finally {
        await svc.stop();
    }
}

test('у evaluate, mesh и external-api разные aud и свои scope', () => {
    const catalog = loadResources({});
    assert.deepEqual(catalog.map((r) => r.key), ['evaluate', 'mesh', 'external-api']);
    assert.equal(new Set(catalog.map((r) => r.audience)).size, 3, 'aud не повторяются');
    assert.deepEqual(catalog.find((r) => r.key === 'evaluate').scopes, ['evaluate:run', 'evaluate:docs', 'evaluate:admin']);
    assert.deepEqual(catalog.find((r) => r.key === 'mesh').scopes, ['mesh:read', 'mesh:write']);
    assert.deepEqual(catalog.find((r) => r.key === 'external-api').scopes, ['mock:read', 'mock:write', 'video:upload', 'score:read']);
    assert.equal(loadResources({ SSO_RESOURCE_EXTERNAL_API: 'https://ext.local' })[2].audience, 'https://ext.local', 'адрес задаётся окружением');
});

test('токен для evaluate не проходит проверку aud у external-api', async () => {
    await withService({ evaluate: ['evaluate:run'], 'external-api': ['score:read'] }, async ({ svc, jwks, id, secret }) => {
        const res = await requestToken(svc.base, id, secret, { resource: RES.evaluate, scope: 'evaluate:run' });
        assert.equal(res.status, 200);
        const { access_token: token } = await res.json();
        const { payload } = verifyJwtWithJwks(token, jwks);
        assert.equal(payload.aud, RES.evaluate, 'aud — тот ресурс, что просил клиент');
        assert.equal(payload.scope, 'evaluate:run');

        assert.equal(acceptedBy(RES.evaluate, token, jwks), true);
        assert.equal(acceptedBy(RES['external-api'], token, jwks), false, 'external-api чужой токен не принимает');
        assert.equal(acceptedBy(RES.mesh, token, jwks), false);
    });
});

test('ресурс вне списка клиента и незнакомый ресурс отбиваются invalid_target', async () => {
    await withService({ evaluate: ['evaluate:run'] }, async ({ svc, id, secret }) => {
        const mesh = await requestToken(svc.base, id, secret, { resource: RES.mesh, scope: 'mesh:read' });
        assert.equal(mesh.status, 400);
        assert.equal((await mesh.json()).error, 'invalid_target');

        const unknown = await requestToken(svc.base, id, secret, { resource: 'https://billing.itk.academy' });
        assert.equal(unknown.status, 400);
        assert.equal((await unknown.json()).error, 'invalid_target');
    });
});

test('на ресурсе клиент получает только разрешённые ему scope', async () => {
    await withService({ evaluate: ['evaluate:run'] }, async ({ svc, jwks, reg, id, secret }) => {
        const res = await requestToken(svc.base, id, secret, { resource: RES.evaluate, scope: 'evaluate:run evaluate:admin' });
        assert.equal(res.status, 200);
        assert.equal(verifyJwtWithJwks((await res.json()).access_token, jwks).payload.scope, 'evaluate:run', 'evaluate:admin не выдан');

        // Правка в админке действует сразу: сняли ресурс — токена на него больше нет.
        reg.update(id, { resources: [] });
        assert.equal((await requestToken(svc.base, id, secret, { resource: RES.evaluate, scope: 'evaluate:run' })).status, 400);
    });
});

test('без resource= токен уходит на общий aud без сервисных scope', async () => {
    await withService({ mesh: ['mesh:read'] }, async ({ svc, jwks, id, secret }) => {
        const res = await requestToken(svc.base, id, secret, { scope: 'mesh:read' });
        assert.equal(res.status, 200);
        const { payload } = verifyJwtWithJwks((await res.json()).access_token, jwks);
        assert.equal(payload.aud, 'https://api.itk.academy');
        assert.equal(payload.scope, undefined, 'mesh:read без aud=mesh не выдаётся');
        assert.equal(acceptedBy(RES.mesh, (await (await requestToken(svc.base, id, secret, { scope: 'mesh:read' })).json()).access_token, jwks), false);
    });
});

test('запись реестра без resources получает ресурсы из своих scope', async () => {
    const reg = new ClientRegistry({ file: tmpFile('clients.json') });
    const { client, secret } = reg.create({ name: 'Mesh старый', scopes: ['openid', 'mesh:read'], grantTypes: ['client_credentials'] });
    assert.equal(reg.get(client._id).resources, undefined, 'поле не задано — как у записей до #2111');
    const svc = await startService({ clients: [], registry: reg });
    try {
        const res = await requestToken(svc.base, client._id, secret, { resource: RES.mesh, scope: 'mesh:read mesh:write' });
        assert.equal(res.status, 200);
        const jwks = await (await fetch(`${svc.base}/.well-known/jwks.json`)).json();
        const { payload } = verifyJwtWithJwks((await res.json()).access_token, jwks);
        assert.equal(payload.aud, RES.mesh);
        assert.equal(payload.scope, 'mesh:read', 'mesh:write у старой записи не было');
        assert.equal((await requestToken(svc.base, client._id, secret, { resource: RES.evaluate })).status, 400);
    } finally {
        await svc.stop();
    }
});
