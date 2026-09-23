'use strict';

const crypto = require('crypto');
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/server');

/** Простейшая банка кук: interaction/session провайдера ходят именно через них. */
function createJar() {
    const jar = new Map();
    return {
        header() {
            return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
        },
        absorb(res) {
            const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
            for (const cookie of raw) {
                const [pair] = cookie.split(';');
                const idx = pair.indexOf('=');
                const name = pair.slice(0, idx);
                const value = pair.slice(idx + 1);
                if (value === '') jar.delete(name);
                else jar.set(name, value);
            }
        },
    };
}

function pkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

const SEED_CLIENT = {
    client_id: 'demo-app',
    client_secret: 'demo-secret',
    client_name: 'Mesh',
    redirect_uris: ['https://app.example.org/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
};

const SERVICE_CLIENT = {
    client_id: 'mesh-service',
    client_secret: 'mesh-secret',
    client_name: 'Mesh (server-to-server)',
    redirect_uris: [],
    grant_types: ['client_credentials'],
    response_types: [],
    token_endpoint_auth_method: 'client_secret_post',
};

/** Поднимает сервис на случайном порту с подменённым itk-portal. */
async function startService({ portalHandler, clients = [SEED_CLIENT, SERVICE_CLIENT], env = {}, registry = null, tokenLog = null } = {}) {
    const config = loadConfig({ PORT: '0', SSO_COOKIE_KEYS: 'test-key', ...env });
    config.seedClients = clients;

    const calls = [];
    const fetchImpl = async (url, options) => {
        calls.push({ url, options, body: JSON.parse(options.body) });
        return portalHandler ? portalHandler(url, options) : new Response('', { status: 401 });
    };

    const { app, provider, store, keys } = await createApp({ config, fetchImpl, registry, tokenLog });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    config.issuer = base;
    provider.issuer = base;

    return {
        base,
        provider,
        store,
        keys,
        calls,
        async stop() {
            await new Promise((resolve) => server.close(resolve));
            await store.close();
        },
    };
}

/** Фальшивый itk-portal: пускает только с оговорённым паролем, иначе 401, как настоящий. */
function portalOk(user, password = 'верный') {
    return async (url, options) => {
        const body = JSON.parse(options.body);
        if (password && body.password !== password) return new Response('', { status: 401 });
        return new Response(JSON.stringify(user), { status: 200, headers: { 'content-type': 'application/json' } });
    };
}

/** Проверка подписи RS256 публичным ключом из JWKS — так же это делает внешняя система. */
function verifyJwtWithJwks(token, jwks) {
    const [head, payload, signature] = token.split('.');
    const header = JSON.parse(Buffer.from(head, 'base64url').toString());
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) return { ok: false, header };
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const ok = crypto.verify(
        'RSA-SHA256',
        Buffer.from(`${head}.${payload}`),
        key,
        Buffer.from(signature, 'base64url'),
    );
    return { ok, header, payload: JSON.parse(Buffer.from(payload, 'base64url').toString()) };
}

module.exports = { createJar, pkce, startService, portalOk, verifyJwtWithJwks, SEED_CLIENT, SERVICE_CLIENT };
