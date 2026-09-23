'use strict';

/**
 * Адаптер хранилища для node-oidc-provider: одна реализация поверх любого store
 * (memory/mongo). Модель Client читается из той же базы — реестр клиентов из #1946
 * пишет туда же, и провайдер видит изменения без перезапуска.
 */
const CONSUMABLE = new Set(['AuthorizationCode', 'RefreshToken', 'DeviceCode', 'BackchannelAuthenticationRequest']);

function createAdapterClass(store, { now = () => Date.now() } = {}) {
    return class StoreAdapter {
        constructor(name) {
            this.name = name;
        }

        async upsert(id, payload, expiresIn) {
            const expiresAt = expiresIn ? now() + expiresIn * 1000 : null;
            await store.upsert(this.name, id, payload, expiresAt);
        }

        async find(id) {
            return store.find(this.name, id);
        }

        async findByUserCode(userCode) {
            return store.findBy(this.name, 'userCode', userCode);
        }

        async findByUid(uid) {
            return store.findBy(this.name, 'uid', uid);
        }

        async consume(id) {
            await store.patch(this.name, id, { consumed: Math.floor(now() / 1000) });
        }

        async destroy(id) {
            await store.destroy(this.name, id);
        }

        async revokeByGrantId(grantId) {
            await store.destroyBy(this.name, 'grantId', grantId);
        }

        static get consumable() {
            return CONSUMABLE;
        }
    };
}

module.exports = { createAdapterClass, CONSUMABLE };
