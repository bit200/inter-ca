const test = require('node:test');
const assert = require('node:assert');

const {
    createRefreshTokenStore,
    resolveAccessTokenTtl,
    buildAccessTokenClaims,
    MIN_ACCESS_TOKEN_TTL_SECONDS,
    MAX_ACCESS_TOKEN_TTL_SECONDS,
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    logoutUser,
    createLogoutHandler,
    createRevokeHandler,
} = require('../index');

function fakeRes() {
    return {
        code: null,
        body: null,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test('логаут гасит все refresh token пользователя и не трогает чужие', () => {
    const store = createRefreshTokenStore();
    const a = store.issue({userId: 'u1', clientId: 'portal'});
    const b = store.issue({userId: 'u1', clientId: 'external-hr'});
    const other = store.issue({userId: 'u2', clientId: 'external-hr'});

    const revoked = store.revokeAllForUser('u1');

    assert.equal(revoked, 2);
    assert.equal(store.isActive(a.token), false);
    assert.equal(store.isActive(b.token), false);
    assert.equal(store.isActive(other.token), true);
    assert.equal(store.get(a.token).revokedReason, 'logout');
});

test('логаут можно сузить до одного клиента', () => {
    const store = createRefreshTokenStore();
    const portal = store.issue({userId: 'u1', clientId: 'portal'});
    const external = store.issue({userId: 'u1', clientId: 'external-hr'});

    const revoked = store.revokeAllForUser('u1', {clientId: 'portal'});

    assert.equal(revoked, 1);
    assert.equal(store.isActive(portal.token), false);
    assert.equal(store.isActive(external.token), true);
});

test('логаут можно сузить до одной сессии', () => {
    const store = createRefreshTokenStore();
    const desktop = store.issue({userId: 'u1', clientId: 'portal', sessionId: 's1'});
    const mobile = store.issue({userId: 'u1', clientId: 'portal', sessionId: 's2'});

    assert.equal(store.revokeAllForUser('u1', {sessionId: 's1'}), 1);
    assert.equal(store.isActive(desktop.token), false);
    assert.equal(store.isActive(mobile.token), true);
});

test('после логаута refresh token нельзя обменять', () => {
    const store = createRefreshTokenStore();
    const rt = store.issue({userId: 'u1', clientId: 'external-hr'});

    store.revokeAllForUser('u1');
    const rotated = store.rotate(rt.token);

    assert.equal(rotated.ok, false);
    assert.equal(rotated.reason, 'revoked');
});

test('повторное предъявление отозванного токена гасит всю цепочку ротаций', () => {
    const store = createRefreshTokenStore();
    const first = store.issue({userId: 'u1', clientId: 'external-hr'});
    const second = store.rotate(first.token);
    assert.equal(second.ok, true);
    assert.equal(store.isActive(second.record.token), true);

    // Украденный старый токен предъявляют повторно.
    const replay = store.rotate(first.token);

    assert.equal(replay.ok, false);
    assert.equal(replay.reason, 'revoked');
    assert.equal(store.isActive(second.record.token), false, 'потомок тоже должен быть отозван');
    assert.equal(store.get(second.record.token).revokedReason, 'reuse_detected');
});

test('протухший refresh token не активен и не обменивается', () => {
    let clock = 1000;
    const store = createRefreshTokenStore({ttlSeconds: 60, now: () => clock});
    const rt = store.issue({userId: 'u1', clientId: 'portal'});

    clock += 61 * 1000;

    assert.equal(store.isActive(rt.token), false);
    assert.equal(store.rotate(rt.token).reason, 'expired');
});

test('TTL access token зажат в коридор 5–15 минут', () => {
    assert.equal(resolveAccessTokenTtl(undefined), DEFAULT_ACCESS_TOKEN_TTL_SECONDS);
    assert.equal(resolveAccessTokenTtl(60), MIN_ACCESS_TOKEN_TTL_SECONDS);
    assert.equal(resolveAccessTokenTtl(24 * 3600), MAX_ACCESS_TOKEN_TTL_SECONDS);
    assert.equal(resolveAccessTokenTtl('600'), 600);
    assert.equal(resolveAccessTokenTtl('нет'), DEFAULT_ACCESS_TOKEN_TTL_SECONDS);
    assert.equal(resolveAccessTokenTtl(-5), DEFAULT_ACCESS_TOKEN_TTL_SECONDS);
    assert.ok(DEFAULT_ACCESS_TOKEN_TTL_SECONDS >= MIN_ACCESS_TOKEN_TTL_SECONDS);
    assert.ok(DEFAULT_ACCESS_TOKEN_TTL_SECONDS <= MAX_ACCESS_TOKEN_TTL_SECONDS);
});

test('claims access token живут не дольше 15 минут', () => {
    const now = 1_700_000_000_000;
    const claims = buildAccessTokenClaims({userId: 'u1', clientId: 'external-hr', ttlSeconds: 3600, now});

    assert.equal(claims.sub, 'u1');
    assert.equal(claims.aud, 'external-hr');
    assert.equal(claims.exp - claims.iat, MAX_ACCESS_TOKEN_TTL_SECONDS);
    assert.throws(() => buildAccessTokenClaims({clientId: 'x'}), /userId/);
});

test('POST /logout отдаёт число отозванных токенов и окно жизни сессии', () => {
    const store = createRefreshTokenStore();
    store.issue({userId: 'u1', clientId: 'portal'});
    store.issue({userId: 'u1', clientId: 'external-hr'});
    const logged = [];
    const handler = createLogoutHandler(store, {accessTokenTtlSeconds: 900, log: e => logged.push(e)});

    const res = fakeRes();
    handler({body: {userId: 'u1'}}, res);

    assert.equal(res.code, 200);
    assert.equal(res.body.revokedRefreshTokens, 2);
    assert.equal(res.body.accessTokenTtlSeconds, 900);
    assert.equal(res.body.sessionEndsWithinSeconds, 900);
    assert.equal(logged.length, 1);
    assert.equal(logged[0].event, 'logout');
});

test('POST /logout без userId отвечает 400', () => {
    const store = createRefreshTokenStore();
    const res = fakeRes();
    createLogoutHandler(store)({body: {}}, res);

    assert.equal(res.code, 400);
    assert.equal(res.body.error, 'invalid_request');
});

test('logoutUser зажимает кривой TTL к дефолту', () => {
    const store = createRefreshTokenStore();
    store.issue({userId: 'u1', clientId: 'portal'});

    const result = logoutUser(store, {userId: 'u1', accessTokenTtlSeconds: 0});

    assert.equal(result.accessTokenTtlSeconds, DEFAULT_ACCESS_TOKEN_TTL_SECONDS);
    assert.equal(result.revokedRefreshTokens, 1);
});

test('POST /revoke гасит один токен и молчит про неизвестный', () => {
    const store = createRefreshTokenStore();
    const rt = store.issue({userId: 'u1', clientId: 'external-hr'});
    const handler = createRevokeHandler(store);

    const res = fakeRes();
    handler({body: {token: rt.token}}, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.revoked, true);
    assert.equal(store.isActive(rt.token), false);

    const res2 = fakeRes();
    handler({body: {token: 'нет-такого'}}, res2);
    assert.equal(res2.code, 200, 'RFC 7009: неизвестный токен — тоже 200');
    assert.equal(res2.body.revoked, false);
});
