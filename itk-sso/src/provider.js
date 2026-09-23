'use strict';

const { Provider } = require('oidc-provider');
const { createAdapterClass } = require('./adapter');
const { createAdapterWithRegistry, attachRegistrySecrets } = require('./clientSource');
const { attachTokenLog } = require('./tokenEvents');
const { buildJwks } = require('./keys');

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
    const Adapter = createAdapterWithRegistry(createAdapterClass(store), registry, { supportedScopes: config.scopes });
    const audience = config.resource;

    return {
        keys,
        configuration: {
            adapter: Adapter,
            clients: config.seedClients,
            jwks: keys.jwks,
            findAccount: accounts.findAccount,
            claims: CLAIMS,
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
                    getResourceServerInfo: (ctx, resourceIndicator) => ({
                        audience: resourceIndicator,
                        scope: config.resourceScopes.join(' '),
                        accessTokenTTL: config.ttl.accessToken,
                        accessTokenFormat: 'jwt',
                        jwt: { sign: { alg: 'RS256' } },
                    }),
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
