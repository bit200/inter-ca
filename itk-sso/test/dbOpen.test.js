'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { openStore, localUrl } = require('../src/db/open');

/** Ровно та ошибка, с которой сервис падал вне docker: getaddrinfo EAI_AGAIN mongo. */
function dnsError(host = 'mongo') {
    const cause = new Error(`getaddrinfo EAI_AGAIN ${host}`);
    cause.code = 'EAI_AGAIN';
    const err = new Error(`MongoServerSelectionError: getaddrinfo EAI_AGAIN ${host}`);
    err.cause = cause;
    return err;
}

function setup({ ok = [], env = {} } = {}) {
    const tried = [];
    const warnings = [];
    const deps = {
        env,
        log: { warn: (m) => warnings.push(String(m)) },
        createMemory: () => ({ driver: 'memory' }),
        async createMongo({ url }) {
            tried.push(url);
            if (!ok.includes(url)) throw dnsError();
            return { driver: 'mongo', url };
        },
    };
    return { tried, warnings, deps };
}

const mongoConfig = { db: { driver: 'mongo', url: 'mongodb://mongo:27017', name: 'itk_sso' } };

test('открытие базы: докеровский хост вне docker подхватывается на 127.0.0.1', async () => {
    const { tried, warnings, deps } = setup({ ok: ['mongodb://127.0.0.1:27017'] });

    const store = await openStore(mongoConfig, deps);

    assert.equal(store.driver, 'mongo');
    assert.deepEqual(tried, ['mongodb://mongo:27017', 'mongodb://127.0.0.1:27017']);
    assert.match(warnings.join('\n'), /127\.0\.0\.1/);
});

test('открытие базы: базы нет совсем — сервис поднимается на памяти, а не падает', async () => {
    const { warnings, deps } = setup({ ok: [] });

    const store = await openStore(mongoConfig, deps);

    assert.equal(store.driver, 'memory', 'без базы старт всё равно должен состояться');
    assert.match(warnings.join('\n'), /в памяти/);
});

test('открытие базы: в production недоступная база по-прежнему валит старт', async () => {
    const { deps } = setup({ ok: [], env: { NODE_ENV: 'production' } });

    await assert.rejects(() => openStore(mongoConfig, deps), /недоступна/);
});

test('открытие базы: memory-драйвер к mongo не ходит', async () => {
    const { tried, deps } = setup();

    const store = await openStore({ db: { driver: 'memory' } }, deps);

    assert.equal(store.driver, 'memory');
    assert.deepEqual(tried, []);
});

test('localUrl: подменяется только нелокальный одиночный хост', () => {
    assert.equal(localUrl('mongodb://mongo:27017'), 'mongodb://127.0.0.1:27017');
    assert.equal(localUrl('mongodb://user:pass@mongo:27017/db?x=1'), 'mongodb://user:pass@127.0.0.1:27017/db?x=1');
    assert.equal(localUrl('mongodb://127.0.0.1:27017'), null);
    assert.equal(localUrl('mongodb://localhost:27017'), null);
    assert.equal(localUrl('mongodb://a:27017,b:27017/db'), null);
});
