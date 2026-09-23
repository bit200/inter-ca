const crypto = require('crypto');

// Хранилище refresh token'ов itk-sso. Дефолтная реализация — в памяти, чтобы
// модуль был проверяем и не тянул БД; каркас сервиса (#1945) подменяет `storage`
// на адаптер своей БД, интерфейс — обычная Map (get/set/values/delete).
const REVOKED_BY_LOGOUT = 'logout';
const REVOKED_BY_REUSE = 'reuse_detected';
const REVOKED_BY_CLIENT = 'client_revocation';

const DEFAULT_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

function createRefreshTokenStore({storage = new Map(), ttlSeconds = DEFAULT_REFRESH_TTL_SECONDS, now = Date.now} = {}) {
    function newToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    function issue({userId, clientId, sessionId = null, scope = '', familyId = null}) {
        if (!userId) throw new Error('refreshTokenStore.issue: userId is required');
        if (!clientId) throw new Error('refreshTokenStore.issue: clientId is required');
        const token = newToken();
        const issuedAt = now();
        const record = {
            token,
            userId: String(userId),
            clientId: String(clientId),
            sessionId: sessionId ? String(sessionId) : null,
            scope,
            // Семья — цепочка ротаций одного логина: отзываем её целиком,
            // иначе отозванный на логауте токен можно было бы «пережить»
            // уже выданным на ротации потомком.
            familyId: familyId || token,
            issuedAt,
            expiresAt: issuedAt + ttlSeconds * 1000,
            revokedAt: null,
            revokedReason: null,
        };
        storage.set(token, record);
        return record;
    }

    function get(token) {
        if (!token) return null;
        return storage.get(token) || null;
    }

    function isExpired(record, at = now()) {
        return record.expiresAt <= at;
    }

    // Активен = существует, не отозван и не протух. Отдельный признак нужен и
    // introspection'у, и обмену refresh → access.
    function isActive(token, at = now()) {
        const record = get(token);
        if (!record) return false;
        return !record.revokedAt && !isExpired(record, at);
    }

    function revokeRecord(record, reason, at) {
        if (record.revokedAt) return false;
        record.revokedAt = at;
        record.revokedReason = reason;
        storage.set(record.token, record);
        return true;
    }

    function revoke(token, reason = REVOKED_BY_CLIENT) {
        const record = get(token);
        if (!record) return 0;
        return revokeRecord(record, reason, now()) ? 1 : 0;
    }

    function revokeFamily(familyId, reason = REVOKED_BY_REUSE) {
        const at = now();
        let revoked = 0;
        for (const record of storage.values()) {
            if (record.familyId === familyId && revokeRecord(record, reason, at)) revoked += 1;
        }
        return revoked;
    }

    // Главная операция логаута: гасим все живые refresh token'ы пользователя.
    // clientId/sessionId сужают до одного клиента или одной сессии — «выйти
    // на этом устройстве» против «выйти везде».
    function revokeAllForUser(userId, {reason = REVOKED_BY_LOGOUT, clientId = null, sessionId = null} = {}) {
        if (!userId) return 0;
        const at = now();
        const uid = String(userId);
        let revoked = 0;
        for (const record of storage.values()) {
            if (record.userId !== uid) continue;
            if (clientId && record.clientId !== String(clientId)) continue;
            if (sessionId && record.sessionId !== String(sessionId)) continue;
            if (revokeRecord(record, reason, at)) revoked += 1;
        }
        return revoked;
    }

    function listForUser(userId) {
        const uid = String(userId);
        return [...storage.values()].filter(it => it.userId === uid);
    }

    // Ротация на обмене refresh → access. Предъявили уже отозванный токен —
    // это либо гонка, либо кража: гасим всю семью и отказываем.
    function rotate(token) {
        const record = get(token);
        if (!record) return {ok: false, reason: 'unknown_token'};
        if (record.revokedAt) {
            revokeFamily(record.familyId, REVOKED_BY_REUSE);
            return {ok: false, reason: 'revoked'};
        }
        if (isExpired(record)) return {ok: false, reason: 'expired'};
        revokeRecord(record, 'rotated', now());
        const next = issue({
            userId: record.userId,
            clientId: record.clientId,
            sessionId: record.sessionId,
            scope: record.scope,
            familyId: record.familyId,
        });
        return {ok: true, record: next, previous: record};
    }

    return {
        issue,
        get,
        isActive,
        revoke,
        revokeFamily,
        revokeAllForUser,
        listForUser,
        rotate,
        storage,
    };
}

module.exports = {
    createRefreshTokenStore,
    DEFAULT_REFRESH_TTL_SECONDS,
    REVOKED_BY_LOGOUT,
    REVOKED_BY_REUSE,
    REVOKED_BY_CLIENT,
};
