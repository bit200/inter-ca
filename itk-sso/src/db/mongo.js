'use strict';

/**
 * Своя база под clients/tokens/sessions. Коллекции — по имени модели oidc-provider
 * (Client, AccessToken, RefreshToken, Session, Grant, Interaction, ...),
 * протухшие записи убирает TTL-индекс по expiresAt.
 */
async function createMongoStore({ url, name, client: injected, options } = {}) {
    const { MongoClient } = require('mongodb');
    // Без таймаута выбора сервера недоступная база держит старт полминуты (#2006).
    const client = injected || new MongoClient(url, options);
    if (!injected) await client.connect();
    const db = client.db(name);
    const prepared = new Set();

    async function col(model) {
        const collection = db.collection(model);
        if (!prepared.has(model)) {
            prepared.add(model);
            await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
            await collection.createIndex({ 'payload.grantId': 1 }).catch(() => {});
            await collection.createIndex({ 'payload.uid': 1 }).catch(() => {});
        }
        return collection;
    }

    return {
        driver: 'mongo',
        db,

        async upsert(model, id, payload, expiresAt = null) {
            const c = await col(model);
            await c.updateOne(
                { _id: id },
                { $set: { payload, expiresAt: expiresAt ? new Date(expiresAt) : null } },
                { upsert: true },
            );
        },

        async find(model, id) {
            const c = await col(model);
            const doc = await c.findOne({ _id: id });
            if (!doc) return undefined;
            if (doc.expiresAt && doc.expiresAt.getTime() <= Date.now()) return undefined;
            return doc.payload;
        },

        async findBy(model, field, value) {
            const c = await col(model);
            const doc = await c.findOne({ [`payload.${field}`]: value });
            if (!doc) return undefined;
            if (doc.expiresAt && doc.expiresAt.getTime() <= Date.now()) return undefined;
            return doc.payload;
        },

        async patch(model, id, patch) {
            const c = await col(model);
            const set = {};
            for (const [key, value] of Object.entries(patch)) set[`payload.${key}`] = value;
            const res = await c.updateOne({ _id: id }, { $set: set });
            return res.matchedCount > 0;
        },

        async destroy(model, id) {
            const c = await col(model);
            await c.deleteOne({ _id: id });
        },

        async destroyBy(model, field, value) {
            const c = await col(model);
            await c.deleteMany({ [`payload.${field}`]: value });
        },

        async list(model) {
            const c = await col(model);
            const docs = await c.find({}).toArray();
            return docs.map((d) => d.payload);
        },

        async close() {
            if (!injected) await client.close();
        },
    };
}

module.exports = { createMongoStore };
