'use strict';

const express = require('express');
const { renderLogin, renderConsent } = require('./views');

/**
 * Экраны входа и согласия для Authorization Code + PKCE.
 * Пароль сюда приходит один раз и сразу уходит на проверку в itk-portal.
 */
function createInteractionRouter({ provider, accounts, ttl = 3600 }) {
    const router = express.Router();
    const body = express.urlencoded({ extended: false });

    const noStore = (req, res, next) => {
        res.set('cache-control', 'no-store');
        next();
    };

    router.get('/interaction/:uid', noStore, async (req, res, next) => {
        try {
            const details = await provider.interactionDetails(req, res);
            const client = await provider.Client.find(details.params.client_id);

            if (details.prompt.name === 'login') {
                return res.send(renderLogin({ uid: details.uid, client }));
            }

            const scopes = String(details.params.scope || '').split(' ').filter(Boolean);
            const profile = details.session ? await accounts.profiles.get(details.session.accountId) : null;
            return res.send(renderConsent({
                uid: details.uid,
                client,
                scopes,
                accountName: (profile && (profile.name || profile.login)) || '',
            }));
        } catch (err) {
            return next(err);
        }
    });

    router.post('/interaction/:uid/login', noStore, body, async (req, res, next) => {
        try {
            const details = await provider.interactionDetails(req, res);
            const login = String(req.body.login || '').trim();
            const password = String(req.body.password || '');

            let account = null;
            let failure = null;
            try {
                account = await accounts.verifyCredentials(login, password);
            } catch (err) {
                failure = 'Портал ITK сейчас не отвечает. Попробуйте войти через минуту.';
                req.log && req.log(err);
            }

            if (!account) {
                const client = await provider.Client.find(details.params.client_id);
                res.status(failure ? 502 : 401);
                return res.send(renderLogin({
                    uid: details.uid,
                    client,
                    login,
                    error: failure || 'Не подошли логин или пароль. Проверьте раскладку и попробуйте ещё раз.',
                }));
            }

            await accounts.profiles.set(account.accountId, {
                login,
                roles: account.roles,
                name: account.claims && account.claims.name,
                email: account.claims && account.claims.email,
                emailVerified: Boolean(account.claims && account.claims.emailVerified),
            }, ttl);

            return await provider.interactionFinished(req, res, {
                login: { accountId: account.accountId, remember: true },
            }, { mergeWithLastSubmission: false });
        } catch (err) {
            return next(err);
        }
    });

    router.post('/interaction/:uid/confirm', noStore, body, async (req, res, next) => {
        try {
            const details = await provider.interactionDetails(req, res);
            const { prompt, params, session } = details;
            const accountId = session && session.accountId;

            let grant = details.grantId
                ? await provider.Grant.find(details.grantId)
                : new provider.Grant({ accountId, clientId: params.client_id });

            if (prompt.details.missingOIDCScope) grant.addOIDCScope(prompt.details.missingOIDCScope.join(' '));
            if (prompt.details.missingOIDCClaims) grant.addOIDCClaims(prompt.details.missingOIDCClaims);
            if (prompt.details.missingResourceScopes) {
                for (const [indicator, scopes] of Object.entries(prompt.details.missingResourceScopes)) {
                    grant.addResourceScope(indicator, scopes.join(' '));
                }
            }

            const grantId = await grant.save();
            return await provider.interactionFinished(req, res, {
                consent: details.grantId ? {} : { grantId },
            }, { mergeWithLastSubmission: true });
        } catch (err) {
            return next(err);
        }
    });

    router.post('/interaction/:uid/abort', noStore, body, async (req, res, next) => {
        try {
            return await provider.interactionFinished(req, res, {
                error: 'access_denied',
                error_description: 'Пользователь отменил вход',
            }, { mergeWithLastSubmission: false });
        } catch (err) {
            return next(err);
        }
    });

    return router;
}

module.exports = { createInteractionRouter };
