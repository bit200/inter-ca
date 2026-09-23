'use strict';

/**
 * Хранилище в памяти: стенд, тесты, первый запуск без Mongo.
 * Интерфейс совпадает с mongo-хранилищем, чтобы адаптер не знал, куда пишет.
 */
function createMemoryStore({ now = () => Date.now() } = {}) {
    const models = new Map();

    function col(model) {
        if (!models.has(model)) models.set(model, new Map());
        return models.get(model);
    }

    function alive(entry) {
        if (!entry) return false;
        if (entry.expiresAt && entry.expiresAt <= now()) return false;
        return true;
    }

    return {
        driver: 'memory',

        async upsert(model, id, payload, expiresAt = null) {
            col(model).set(id, { id, payload: { ...payload }, expiresAt });
        },

        async find(model, id) {
            const entry = col(model).get(id);
            if (!alive(entry)) {
                col(model).delete(id);
                return undefined;
            }
            return { ...entry.payload };
        },

        async findBy(model, field, value) {
            for (const [id, entry] of col(model)) {
                if (!alive(entry)) {
                    col(model).delete(id);
                    continue;
                }
                if (entry.payload[field] === value) return { ...entry.payload };
            }
            return undefined;
        },

        async patch(model, id, patch) {
            const entry = col(model).get(id);
            if (!alive(entry)) return false;
            Object.assign(entry.payload, patch);
            return true;
        },

        async destroy(model, id) {
            col(model).delete(id);
        },

        async destroyBy(model, field, value) {
            for (const [id, entry] of col(model)) {
                if (entry.payload[field] === value) col(model).delete(id);
            }
        },

        async list(model) {
            const out = [];
            for (const [id, entry] of col(model)) {
                if (!alive(entry)) {
                    col(model).delete(id);
                    continue;
                }
                out.push({ ...entry.payload });
            }
            return out;
        },

        async close() {
            models.clear();
        },
    };
}

module.exports = { createMemoryStore };
