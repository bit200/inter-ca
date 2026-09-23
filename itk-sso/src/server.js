'use strict';

const express = require('express');
const { loadConfig } = require('./config');
const { createMemoryStore } = require('./db/memory');
const { createAccountService } = require('./accounts');
const { createProvider } = require('./provider');
const { createInteractionRouter } = require('./interactions');
const { createDemoRouter } = require('./demo');

async function createStore(config) {
    if (config.db.driver === 'mongo') {
        const { createMongoStore } = require('./db/mongo');
        return createMongoStore({ url: config.db.url, name: config.db.name });
    }
    return createMemoryStore();
}

/** Профили пользователей с портала кладём в ту же базу, что и токены. */
function createProfileStore(store, ttlSeconds) {
    return {
        async get(accountId) {
            return store.find('AccountProfile', accountId);
        },
        async set(accountId, profile) {
            await store.upsert('AccountProfile', accountId, profile, Date.now() + ttlSeconds * 1000);
        },
    };
}

async function createApp(overrides = {}) {
    const config = overrides.config || loadConfig();
    const store = overrides.store || (await createStore(config));

    const accounts = overrides.accounts || createAccountService({
        portal: config.portal,
        fetchImpl: overrides.fetchImpl,
        profiles: createProfileStore(store, config.ttl.session),
    });

    // Реестр клиентов и журнал токенов — те же экземпляры, что у админки:
    // клиент, заведённый через /admin, виден провайдеру сразу.
    const registry = overrides.registry || null;
    const tokenLog = overrides.tokenLog || null;

    const { provider, keys } = createProvider(config, { accounts, store, registry, tokenLog });

    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', true);

    app.get('/healthz', (req, res) => {
        res.json({ ok: true, issuer: config.issuer, store: store.driver, kid: keys.kid });
    });

    // Привычный адрес JWKS рядом со штатным /jwks — внешние системы ищут его здесь.
    app.get('/.well-known/jwks.json', (req, res) => {
        res.set('cache-control', 'public, max-age=300');
        res.json(keys.publicJwks);
    });

    // Реестр OAuth-клиентов с админкой (#1946) монтируется внутрь сервиса, отдельный процесс не нужен.
    if (overrides.adminRouter) app.use('/admin', overrides.adminRouter);

    // Демо-«внешняя система» для локальной проверки входа. В проде выключается флагом SSO_DEMO=0.
    if (config.demo && config.demo.enabled) app.use(createDemoRouter({ config }));

    app.use(createInteractionRouter({ provider, accounts, ttl: config.ttl.session }));
    app.use(provider.callback());

    return { app, provider, config, store, accounts, keys, registry, tokenLog };
}

module.exports = { createApp, createProfileStore };
