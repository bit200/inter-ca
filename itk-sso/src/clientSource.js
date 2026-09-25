'use strict';

const { interactionPolicy } = require('oidc-provider');

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
 * resourceIndicators, а не карточка клиента.
 */
function toClientMetadata(client, { supportedScopes = null } = {}) {
    const grantTypes = (client.grantTypes && client.grantTypes.length) ? client.grantTypes.slice() : ['authorization_code'];
    const code = grantTypes.indexOf('authorization_code') > -1;
    const known = supportedScopes ? [...supportedScopes] : null;
    const scopes = known ? (client.scopes || []).filter((s) => known.indexOf(s) > -1) : (client.scopes || []);

    return {
        client_id: client._id,
        client_name: client.name || client._id,
        client_secret: secretFingerprint(client),
        redirect_uris: code ? (client.redirectUris || []) : [],
        // Куда вернуть человека после выхода (RP-initiated logout): чужие адреса провайдер отбивает.
        post_logout_redirect_uris: code ? (client.postLogoutRedirectUris || []) : [],
        grant_types: grantTypes,
        response_types: code ? ['code'] : [],
        scope: scopes.length ? scopes.join(' ') : undefined,
        // Реестр не хранит способ аутентификации: все клиенты itk-sso шлют секрет
        // в теле запроса (client_secret_post), как и сид-клиенты стенда.
        token_endpoint_auth_method: client.tokenEndpointAuthMethod || 'client_secret_post',
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

/**
 * Что клиенту из реестра разрешено сверх метаданных OIDC: ресурсы (aud), scope'ы
 * на ресурсе и пропуск экрана согласия. Клиенты из SSO_SEED_CLIENTS в реестре не
 * лежат — для них ограничения прежние: любой известный ресурс, все его scope'ы, согласие.
 *
 * knownResources — ресурсы сервиса (SSO_RESOURCES), resourceScopes — scope'ы ресурсов
 * (SSO_RESOURCE_SCOPES). Пустой список ресурсов у клиента = только ресурс по умолчанию.
 */
function createClientPolicy(registry, { knownResources = [], resourceScopes = [], defaultResource = null } = {}) {
    const entry = (clientId) => (registry && clientId ? registry.getRaw(clientId) : null);

    return {
        fromRegistry(clientId) {
            return Boolean(entry(clientId));
        },

        allowedResources(clientId) {
            const client = entry(clientId);
            if (!client) return knownResources.slice();
            const own = (client.resources || []).filter((r) => knownResources.indexOf(r) > -1);
            if (own.length) return own;
            return defaultResource ? [defaultResource] : [];
        },

        defaultResourceFor(clientId) {
            const allowed = this.allowedResources(clientId);
            if (defaultResource && allowed.indexOf(defaultResource) > -1) return defaultResource;
            return allowed[0] || defaultResource;
        },

        resourceAllowed(clientId, indicator) {
            return this.allowedResources(clientId).indexOf(indicator) > -1;
        },

        /** Scope'ы ресурса, которые клиенту вообще можно выдать: пересечение с его карточкой. */
        resourceScopesFor(clientId) {
            const client = entry(clientId);
            if (!client) return resourceScopes.slice();
            return resourceScopes.filter((s) => (client.scopes || []).indexOf(s) > -1);
        },

        /** Наша внутренняя система: согласие у человека не спрашиваем. */
        isFirstParty(clientId) {
            const client = entry(clientId);
            return Boolean(client && client.firstParty);
        },
    };
}

/**
 * loadExistingGrant провайдера: для first-party клиента грант выписываем сами на
 * запрошенное (в пределах карточки клиента — лишнее провайдер уже отрезал), и экран
 * согласия не появляется. Для сторонних — штатное поведение: грант только из согласия.
 */
function createLoadExistingGrant(policy) {
    return async function loadExistingGrant(ctx) {
        const { oidc } = ctx;
        const clientId = oidc.client.clientId;
        const grantId = (oidc.result && oidc.result.consent && oidc.result.consent.grantId)
            || oidc.session.grantIdFor(clientId);
        const existing = grantId ? await oidc.provider.Grant.find(grantId) : undefined;

        if (!policy.isFirstParty(clientId) || !oidc.session.accountId) return existing;

        const grant = existing || new oidc.provider.Grant({ clientId, accountId: oidc.session.accountId });
        const oidcScopes = [...(oidc.requestParamOIDCScopes || [])];
        if (oidcScopes.length) grant.addOIDCScope(oidcScopes.join(' '));
        const claims = [...(oidc.requestParamClaims || [])];
        if (claims.length) grant.addOIDCClaims(claims);
        const requested = oidc.requestParamScopes || new Set();
        for (const [indicator, server] of Object.entries(oidc.resourceServers || {})) {
            const scopes = [...server.scopes].filter((s) => requested.has(s));
            if (scopes.length) grant.addResourceScope(indicator, scopes.join(' '));
        }
        await grant.save();
        return grant;
    };
}

/**
 * Политика экранов: всё штатное, кроме одного — явный prompt=consent (без него
 * провайдер не выдаёт offline_access, поэтому внешние системы шлют его всегда)
 * first-party клиенту экран согласия не открывает. Грант своим выписывает
 * loadExistingGrant, так что прочие проверки согласия тоже проходят молча.
 */
function createInteractionPolicy(policy) {
    const prompts = interactionPolicy.base();
    const requested = prompts.get('consent').checks.get('consent_prompt');
    const original = requested.check;
    requested.check = (ctx) => (policy.isFirstParty(ctx.oidc.client.clientId) ? false : original(ctx));
    return prompts;
}

module.exports = {
    createClientPolicy,
    createInteractionPolicy,
    createLoadExistingGrant,
    toClientMetadata,
    createClientAdapterClass,
    createAdapterWithRegistry,
    attachRegistrySecrets,
    SECRET_PREFIX,
};
