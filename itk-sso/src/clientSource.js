'use strict';

const { effectiveResources, DEFAULT_RESOURCES } = require('../lib/resources');

/**
 * Клиенты провайдера берутся из реестра админки (lib/clients.js), а не только из
 * SSO_SEED_CLIENTS. Реестр — живой источник: заведённый в админке клиент работает
 * в /auth и /token сразу, выключенный и удалённый перестают работать без
 * перезапуска, ротация секрета действует с первого же запроса.
 *
 * SSO_SEED_CLIENTS остаётся запасным вариантом для голого стенда: статические
 * клиенты провайдер ищет первыми, реестр подхватывает всё остальное.
 */

// Секрет в реестре лежит scrypt-хешем, восстановить строку нельзя. Провайдеру
// отдаём только отпечаток: войти по нему нельзя (проверку мы перехватываем и
// уводим в реестр), но он меняется при ротации — и кэш клиента внутри
// node-oidc-provider (ключ = хеш метаданных) сам сбрасывается.
const SECRET_PREFIX = 'registry$';

function secretFingerprint(client) {
    return SECRET_PREFIX + (client.secretHash || '');
}

/**
 * Запись реестра -> метаданные клиента в терминах OIDC.
 * В metadata.scope провайдер пускает только свои статические scope'ы, поэтому
 * ресурсные (mesh:read, evaluate:run) из списка выкидываем — ими распоряжается
 * resourceIndicators, а не карточка клиента. Разрешённые клиенту ресурсы и
 * scope'ы на каждом едут в itk_resources — их читает getResourceServerInfo.
 */
function toClientMetadata(client, { supportedScopes = null, resources = DEFAULT_RESOURCES } = {}) {
    const grantTypes = (client.grantTypes && client.grantTypes.length) ? client.grantTypes.slice() : ['authorization_code'];
    const code = grantTypes.indexOf('authorization_code') > -1;
    const known = supportedScopes ? [...supportedScopes] : null;
    const scopes = known ? (client.scopes || []).filter((s) => known.indexOf(s) > -1) : (client.scopes || []);

    return {
        client_id: client._id,
        client_name: client.name || client._id,
        client_secret: secretFingerprint(client),
        redirect_uris: code ? (client.redirectUris || []) : [],
        grant_types: grantTypes,
        response_types: code ? ['code'] : [],
        scope: scopes.length ? scopes.join(' ') : undefined,
        // Реестр не хранит способ аутентификации: все клиенты itk-sso шлют секрет
        // в теле запроса (client_secret_post), как и сид-клиенты стенда.
        token_endpoint_auth_method: client.tokenEndpointAuthMethod || 'client_secret_post',
        itk_resources: effectiveResources(client, resources),
    };
}

/**
 * Адаптер модели Client поверх реестра. Выключенного клиента не отдаём вовсе —
 * для провайдера он просто не существует, и /token отвечает invalid_client.
 */
function createClientAdapterClass(registry, options = {}) {
    return class RegistryClientAdapter {
        async find(id) {
            const client = registry.getRaw(id);
            if (!client || !client.enabled) return undefined;
            return toClientMetadata(client, options);
        }

        // Реестром управляет админка, провайдер в него не пишет.
        async upsert() {}
        async findByUserCode() {}
        async findByUid() {}
        async consume() {}
        async destroy() {}
        async revokeByGrantId() {}
    };
}

/**
 * Один адаптер на всё: модель Client идёт в реестр, остальные модели (токены,
 * сессии, гранты) — в обычное хранилище.
 */
function createAdapterWithRegistry(StoreAdapter, registry, options = {}) {
    if (!registry) return StoreAdapter;
    const ClientAdapter = createClientAdapterClass(registry, options);

    return class Adapter {
        constructor(name) {
            return name === 'Client' ? new ClientAdapter() : new StoreAdapter(name);
        }

        static get consumable() {
            return StoreAdapter.consumable;
        }
    };
}

/**
 * Проверку секрета уводим в реестр: там scrypt и там же решение «клиент выключен
 * — значит доступа нет». Отпечаток, который лежит в метаданных, сам по себе
 * паролем не является.
 */
function attachRegistrySecrets(provider, registry) {
    if (!registry) return provider;
    const Client = provider.Client;
    const original = Client.prototype.compareClientSecret;

    Client.prototype.compareClientSecret = function compareClientSecret(actual) {
        if (typeof this.clientSecret === 'string' && this.clientSecret.startsWith(SECRET_PREFIX)) {
            return registry.verifySecret(this.clientId, actual).ok;
        }
        return original.call(this, actual);
    };

    return provider;
}

module.exports = {
    toClientMetadata,
    createClientAdapterClass,
    createAdapterWithRegistry,
    attachRegistrySecrets,
    SECRET_PREFIX,
};
