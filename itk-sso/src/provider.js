'use strict';

const { Provider, errors } = require('oidc-provider');
const { createAdapterClass } = require('./adapter');
const { createAdapterWithRegistry, attachRegistrySecrets } = require('./clientSource');
const { attachTokenLog } = require('./tokenEvents');
const { buildJwks } = require('./keys');
const { byAudience } = require('../lib/resources');

const CLAIMS = {
    openid: ['sub'],
    profile: ['name', 'preferred_username'],
    email: ['email', 'email_verified'],
    roles: ['roles'],
};

/**
 * Конфигурация node-oidc-provider под два сценария:
 *  - Authorization Code + PKCE — «Войти через ITK» во внешней системе;
 *  - Client Credentials — server-to-server (mesh, evaluate).
 * Токены — JWT RS256, публичные ключи отдаются на /jwks: проверять подпись
 * можно локально, без обратных вызовов в itk-sso.
 */
function buildProviderConfig(config, { accounts, store, registry = null }) {
    const keys = buildJwks(config.keys);
    // Клиенты — из реестра админки; SSO_SEED_CLIENTS остаётся статическим
    // запасом для голого стенда (статику провайдер ищет первой).
    const Adapter = createAdapterWithRegistry(createAdapterClass(store), registry, {
        supportedScopes: config.scopes,
        resources: config.resources,
    });
    const audience = config.resource;

    // У каждого сервиса свой aud (#2111). Ресурс сервиса выдаём только клиенту,
    // которому он разрешён, и только с разрешёнными ему scope'ами; незнакомый
    // или чужой ресурс — invalid_target. Общий ресурс по умолчанию (SSO_DEFAULT_RESOURCE)
    // сервисных scope'ов не несёт: такой токен ни evaluate, ни mesh не примет.
    const resourceServerInfo = (resourceIndicator, client) => {
        const base = {
            audience: resourceIndicator,
            accessTokenTTL: config.ttl.accessToken,
            accessTokenFormat: 'jwt',
            jwt: { sign: { alg: 'RS256' } },
        };
        if (resourceIndicator === audience) {
            return { ...base, scope: config.resourceScopes.join(' ') };
        }
        const resource = byAudience(config.resources, resourceIndicator);
        if (!resource) throw new errors.InvalidTarget(`неизвестный ресурс ${resourceIndicator}`);
        const allowed = ((client && client.itk_resources) || []).find((r) => r.resource === resource.key);
        if (!allowed) throw new errors.InvalidTarget(`ресурс ${resource.key} клиенту не разрешён`);
        const scopes = resource.scopes.filter((s) => allowed.scopes.indexOf(s) > -1);
        if (!scopes.length) throw new errors.InvalidTarget(`на ресурсе ${resource.key} клиенту не разрешён ни один scope`);
        return { ...base, scope: scopes.join(' ') };
    };

    return {
        keys,
        configuration: {
            adapter: Adapter,
            clients: config.seedClients,
            jwks: keys.jwks,
            findAccount: accounts.findAccount,
            claims: CLAIMS,
            // Разрешённые ресурсы клиента: [{resource: 'mesh', scopes: ['mesh:read']}].
            extraClientMetadata: {
                properties: ['itk_resources'],
                validator(ctx, key, value) {
                    if (key !== 'itk_resources' || value === undefined) return;
                    const ok = Array.isArray(value) && value.every((r) => r && typeof r.resource === 'string' && Array.isArray(r.scopes));
                    if (!ok) throw new errors.InvalidClientMetadata('itk_resources: ожидается [{resource, scopes: []}]');
                },
            },
            scopes: config.scopes,
            responseTypes: ['code'],
            subjectTypes: ['public'],
            grantTypes: ['authorization_code', 'refresh_token', 'client_credentials'],

            pkce: {
                // PKCE обязателен всем, включая конфиденциальных клиентов.
                required: () => true,
            },

            features: {
                devInteractions: { enabled: false },
                clientCredentials: { enabled: true },
                introspection: { enabled: true },
                revocation: { enabled: true },
                userinfo: { enabled: true },
                resourceIndicators: {
                    enabled: true,
                    defaultResource: () => audience,
                    useGrantedResource: () => true,
                    getResourceServerInfo: (ctx, resourceIndicator, client) => resourceServerInfo(resourceIndicator, client),
                },
            },

            enabledJWA: {
                idTokenSigningAlgValues: ['RS256'],
                userinfoSigningAlgValues: ['RS256'],
                introspectionSigningAlgValues: ['RS256'],
                requestObjectSigningAlgValues: ['RS256'],
            },

            clientDefaults: {
                grant_types: ['authorization_code', 'refresh_token'],
                id_token_signed_response_alg: 'RS256',
                response_types: ['code'],
            },

            ttl: {
                AccessToken: (ctx, token) => (token.clientCredentials ? config.ttl.clientCredentials : config.ttl.accessToken),
                ClientCredentials: config.ttl.clientCredentials,
                AuthorizationCode: config.ttl.authorizationCode,
                IdToken: config.ttl.idToken,
                RefreshToken: config.ttl.refreshToken,
                Session: config.ttl.session,
                Interaction: config.ttl.interaction,
                Grant: config.ttl.grant,
            },

            cookies: {
                keys: config.cookieKeys,
                long: { signed: true, sameSite: 'lax' },
                short: { signed: true, sameSite: 'lax' },
            },

            interactions: {
                url: (ctx, interaction) => `/interaction/${interaction.uid}`,
            },

            // Роли едут прямо в access token: ресурс-сервер решает по JWT, без похода в SSO.
            extraTokenClaims: async (ctx, token) => {
                const extra = { client_id: token.clientId };
                if (token.accountId && accounts.profiles) {
                    const profile = (await accounts.profiles.get(token.accountId)) || {};
                    if (profile.roles) extra.roles = profile.roles;
                }
                return extra;
            },

            renderError: async (ctx, out, error) => {
                ctx.type = 'json';
                ctx.body = { error: out.error, error_description: out.error_description || (error && error.message) };
            },
        },
    };
}

function createProvider(config, deps) {
    const { configuration, keys } = buildProviderConfig(config, deps);
    const provider = new Provider(config.issuer, configuration);
    provider.proxy = true;
    attachRegistrySecrets(provider, deps.registry);
    attachTokenLog(provider, deps.tokenLog, { registry: deps.registry });
    return { provider, keys, configuration };
}

module.exports = { createProvider, buildProviderConfig, CLAIMS };
