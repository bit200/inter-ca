'use strict';

/**
 * Журнал токенов (lib/tokenLog.js) заполняется самим провайдером, а не только
 * ручкой POST /admin/api/token-log: выдали токен — строка «issued», отбили
 * запрос — «denied», погасили грант — «revoked». Иначе в админке видно только
 * то, что кто-то дописал руками.
 */

const TOKEN_TYPE = {
    AccessToken: 'access',
    ClientCredentials: 'access',
    RefreshToken: 'refresh',
    IdToken: 'id',
};

function clientNameOf(registry, clientId, fallback) {
    if (registry && clientId) {
        const client = registry.getRaw(clientId);
        if (client) return client.name || '';
    }
    return fallback || '';
}

function scopesOf(token) {
    if (!token || !token.scope) return [];
    return String(token.scope).split(/\s+/).filter(Boolean);
}

function attachTokenLog(provider, log, { registry = null } = {}) {
    if (!log) return provider;

    provider.on('grant.success', (ctx) => {
        const oidc = ctx.oidc || {};
        const entities = oidc.entities || {};
        const client = oidc.client || {};
        const clientId = client.clientId || (oidc.params && oidc.params.client_id) || '';
        const base = {
            clientId,
            clientName: clientNameOf(registry, clientId, client.clientName),
            grantType: (oidc.params && oidc.params.grant_type) || '',
            ip: ctx.ip || '',
        };

        for (const kind of Object.keys(TOKEN_TYPE)) {
            const token = entities[kind];
            if (!token) continue;
            log.issued({
                ...base,
                tokenType: TOKEN_TYPE[kind],
                subject: token.accountId || (kind === 'ClientCredentials' ? clientId : ''),
                scopes: scopesOf(token),
                jti: token.jti || '',
            });
        }
    });

    provider.on('grant.error', (ctx, err) => {
        const oidc = ctx.oidc || {};
        const client = oidc.client || {};
        const clientId = client.clientId || (oidc.params && oidc.params.client_id) || '';
        log.denied({
            clientId,
            clientName: clientNameOf(registry, clientId, client.clientName),
            grantType: (oidc.params && oidc.params.grant_type) || '',
            reason: (err && (err.error_description || err.error || err.message)) || '',
            ip: ctx.ip || '',
        });
    });

    provider.on('grant.revoked', (ctx) => {
        const oidc = ctx.oidc || {};
        const client = oidc.client || {};
        const clientId = client.clientId || (oidc.params && oidc.params.client_id) || '';
        const token = (oidc.entities && (oidc.entities.RefreshToken || oidc.entities.AccessToken || oidc.entities.ClientCredentials)) || null;
        log.revoked({
            clientId,
            clientName: clientNameOf(registry, clientId, client.clientName),
            tokenType: token && token.kind === 'RefreshToken' ? 'refresh' : 'access',
            subject: (token && token.accountId) || (oidc.session && oidc.session.accountId) || '',
            jti: (token && token.jti) || '',
            reason: 'revocation',
            ip: ctx.ip || '',
        });
    });

    return provider;
}

module.exports = { attachTokenLog, TOKEN_TYPE };
