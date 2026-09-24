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
                failure = portalFailure(err);
                req.log && req.log(err);
            }

            if (!account) {
                const client = await provider.Client.find(details.params.client_id);
                res.status(failure ? 502 : 401);
                // Подсказка про локальные учётки нужна не только при сбое портала: когда
                // портал в окружении не задан, пароль проверять негде и человеку надо
                // сказать, чем входить, а не оставлять его с «не подошли логин или пароль».
                const offerLocal = Boolean(failure) || !accounts.verifyUrl;
                return res.send(renderLogin({
                    uid: details.uid,
                    client,
                    login,
                    error: failure || 'Не подошли логин или пароль. Проверьте раскладку и попробуйте ещё раз.',
                    hint: offerLocal ? localLoginHint(accounts) : '',
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

/**
 * Сообщение об отказе портала целиком. 404/405/501 — это не «подождите минуту»:
 * по такому адресу отвечает не портал, и через минуту ответит то же самое.
 * 502/503/504 — тоже не «подождите минуту»: так отвечает прокси перед порталом,
 * до самого портала запрос не дошёл, и пока портал не поднимут, ответ будет тот же.
 */
function portalFailure(err) {
    const status = portalStatus(err);
    if (status === 404 || status === 405 || status === 501) {
        return `Вход через портал ITK не настроен: по адресу проверки пароля ответ ${status}, так отвечает не портал. Поправьте ITK_PORTAL_URL.`;
    }
    if (status === 502 || status === 503 || status === 504) {
        return `Портал ITK не проверил пароль: по адресу из ITK_PORTAL_URL ответ ${status} — это ответ прокси, сам портал за ним не поднят. Запустите портал: повторная попытка до этого даст то же самое.`;
    }
    return `Портал ITK сейчас не отвечает: ${portalReason(err)}. Попробуйте войти через минуту.`;
}

/** HTTP-код из ошибки verify-credentials, если он там был. */
function portalStatus(err) {
    const http = err && /HTTP (\d{3})/.exec(String(err.message));
    return http ? Number(http[1]) : null;
}

/** Причина словами, а не кодом: человек на стенде должен понимать, куда не дошли. */
function portalReason(err) {
    const code = err && (err.cause ? err.cause.code : err.code);
    if (code === 'ECONNREFUSED') return 'порт закрыт, служба не запущена';
    if (err && err.name === 'TimeoutError') return 'ответ не пришёл за отведённое время';
    const status = portalStatus(err);
    if (status) return `ответил ${status}`;
    return String((err && err.message) || 'связи нет');
}

/** Пока портала нет, войти всё же можно — локальными учётками из SSO_DEV_USERS. */
function localLoginHint(accounts) {
    const logins = (accounts && accounts.devLogins) || [];
    if (!logins.length) return '';
    return `Для проверки стенда войдите локальной учётной записью ${logins.join(' или ')} — она задана в SSO_DEV_USERS и портала не требует.`;
}

module.exports = { createInteractionRouter, portalReason, portalFailure };
