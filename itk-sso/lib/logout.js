const {resolveAccessTokenTtl} = require('./accessTokenTtl');
const {REVOKED_BY_LOGOUT, REVOKED_BY_CLIENT} = require('./refreshTokenStore');

// Логаут без back-channel push: itk-portal при выходе пользователя дёргает
// itk-sso, тот гасит refresh token(ы). Внешние системы про логаут не узнают —
// они просто не смогут обновить сессию, и потеряют её в пределах TTL access
// token'а (5–15 минут). Собственный logout-webhook им реализовывать не нужно.
function logoutUser(store, {userId, clientId = null, sessionId = null, accessTokenTtlSeconds, log = null} = {}) {
    if (!userId) throw new Error('logoutUser: userId is required');
    const revoked = store.revokeAllForUser(userId, {reason: REVOKED_BY_LOGOUT, clientId, sessionId});
    const ttl = resolveAccessTokenTtl(accessTokenTtlSeconds);
    const result = {
        userId: String(userId),
        revokedRefreshTokens: revoked,
        // Сколько ещё в худшем случае проживёт уже выданный access token —
        // это и есть окно, в котором внешняя система догорает.
        accessTokenTtlSeconds: ttl,
        sessionEndsWithinSeconds: ttl,
    };
    log && log({event: 'logout', ...result, clientId, sessionId});
    return result;
}

// Express-совместимый POST /logout. Вызывается itk-portal'ом (внутренний
// вызов), а не браузером внешней системы.
function createLogoutHandler(store, {accessTokenTtlSeconds, log = null} = {}) {
    return function logoutHandler(req, res) {
        const body = (req && req.body) || {};
        const userId = body.userId || body.user_id;
        if (!userId) {
            return res.status(400).json({error: 'invalid_request', error_description: 'userId is required'});
        }
        const result = logoutUser(store, {
            userId,
            clientId: body.clientId || body.client_id || null,
            sessionId: body.sessionId || body.session_id || null,
            accessTokenTtlSeconds,
            log,
        });
        return res.status(200).json(result);
    };
}

// RFC 7009: отзыв конкретного токена. По спеке отвечаем 200 и на неизвестный
// токен — чтобы не превращать эндпоинт в оракул существования токенов.
function createRevokeHandler(store, {log = null} = {}) {
    return function revokeHandler(req, res) {
        const body = (req && req.body) || {};
        const token = body.token;
        if (!token) {
            return res.status(400).json({error: 'invalid_request', error_description: 'token is required'});
        }
        const record = store.get(token);
        const revoked = store.revoke(token, REVOKED_BY_CLIENT);
        log && log({event: 'revoke', token, revoked: revoked > 0, userId: record ? record.userId : null});
        return res.status(200).json({revoked: revoked > 0});
    };
}

module.exports = {logoutUser, createLogoutHandler, createRevokeHandler};
