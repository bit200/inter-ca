'use strict';

const { createMemoryStore } = require('./memory');

/**
 * Открытие хранилища по конфигу. Раньше сервис просто падал на старте, если mongo
 * не отвечала: в .env лежит докеровский `mongodb://mongo:27017`, и вне docker имя
 * `mongo` не резолвится — `node index.js` умирал с MongoServerSelectionError
 * (getaddrinfo EAI_AGAIN mongo) и порт не поднимался вовсе (#2006).
 *
 * Теперь то же имя вне docker не смертельно:
 *  1) не резолвится хост из URL — пробуем тот же адрес на 127.0.0.1 (именно так
 *     и написано в .env.example: «вне docker: mongodb://127.0.0.1:27017»);
 *  2) базы нет совсем — вне production поднимаемся на хранилище в памяти и громко
 *     об этом пишем, а в production по-прежнему падаем: там тихая потеря сессий хуже.
 */

const DNS_CODES = new Set(['EAI_AGAIN', 'ENOTFOUND']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Причина ошибки может лежать в глубине cause/reason — ищем код DNS по всей цепочке. */
function isDnsFailure(err) {
    const seen = new Set();
    let cur = err;
    while (cur && typeof cur === 'object' && !seen.has(cur)) {
        seen.add(cur);
        if (DNS_CODES.has(cur.code)) return true;
        cur = cur.cause || cur.reason;
    }
    return /EAI_AGAIN|ENOTFOUND|getaddrinfo/.test(String(err && err.message));
}

/** mongodb://mongo:27017 → mongodb://127.0.0.1:27017; локальный адрес возвращаем как есть. */
function localUrl(url) {
    const m = String(url).match(/^(mongodb(?:\+srv)?:\/\/)([^/?]*)(.*)$/);
    if (!m) return null;
    const [, scheme, authority, rest] = m;
    const at = authority.lastIndexOf('@');
    const credentials = at === -1 ? '' : authority.slice(0, at + 1);
    const hosts = authority.slice(at + 1);
    // Несколько хостов (реплика-сет) на localhost не заменяем: это уже не «забыли docker».
    if (hosts.includes(',')) return null;
    const port = hosts.includes(':') ? hosts.slice(hosts.lastIndexOf(':')) : '';
    const host = port ? hosts.slice(0, hosts.length - port.length) : hosts;
    if (!host || LOCAL_HOSTS.has(host)) return null;
    return `${scheme}${credentials}127.0.0.1${port}${rest}`;
}

async function openStore(config, deps = {}) {
    const createMongo = deps.createMongo || require('./mongo').createMongoStore;
    const memory = deps.createMemory || createMemoryStore;
    const log = deps.log || console;
    const env = deps.env || process.env;

    if (!config.db || config.db.driver !== 'mongo') return memory();

    const { url, name } = config.db;
    const options = { serverSelectionTimeoutMS: Number(env.SSO_MONGO_TIMEOUT_MS) || 5000 };

    function orMemory(err, triedUrl) {
        if (env.NODE_ENV === 'production') {
            throw new Error(`itk-sso: база ${triedUrl} недоступна (${err.message}). `
                + 'Поднимите mongo или укажите SSO_DB_DRIVER=memory.');
        }
        log.warn(`itk-sso: база ${triedUrl} недоступна (${err.message}) — поднимаюсь на хранилище в памяти. `
            + 'Клиенты, сессии и токены живут только до перезапуска.');
        return memory();
    }

    try {
        return await createMongo({ url, name, options });
    } catch (err) {
        const fallbackUrl = isDnsFailure(err) ? localUrl(url) : null;
        if (!fallbackUrl) return orMemory(err, url);

        log.warn(`itk-sso: хост из SSO_MONGO_URL (${url}) не резолвится — вне docker пробую ${fallbackUrl}`);
        try {
            return await createMongo({ url: fallbackUrl, name, options });
        } catch (localErr) {
            return orMemory(localErr, fallbackUrl);
        }
    }
}

module.exports = { openStore, localUrl, isDnsFailure };
