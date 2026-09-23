// TTL access token в itk-sso. Логаут на itk-portal не пушится во внешние системы
// back-channel'ом: мы гасим refresh token, а уже выданный access token просто
// доживает свой короткий срок. Поэтому срок жизни обязан быть коротким и
// предсказуемым — иначе «вышел на портале» превращается в «вышел когда-нибудь».
const MIN_ACCESS_TOKEN_TTL_SECONDS = 5 * 60;
const MAX_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

// Всё, что пришло из env/настроек клиента, зажимаем в коридор 5–15 минут.
// Мусор (не число, отрицательное, NaN) — это не повод выдать вечный токен,
// поэтому валимся на дефолт, а не на максимум.
function resolveAccessTokenTtl(value, fallback = DEFAULT_ACCESS_TOKEN_TTL_SECONDS) {
    let ttl = typeof value === 'string' ? Number(value.trim()) : value;
    if (typeof ttl !== 'number' || !Number.isFinite(ttl) || ttl <= 0) {
        ttl = fallback;
    }
    ttl = Math.round(ttl);
    if (ttl < MIN_ACCESS_TOKEN_TTL_SECONDS) return MIN_ACCESS_TOKEN_TTL_SECONDS;
    if (ttl > MAX_ACCESS_TOKEN_TTL_SECONDS) return MAX_ACCESS_TOKEN_TTL_SECONDS;
    return ttl;
}

// Claims для RS256-подписи (подписывает каркас на node-oidc-provider, задача #1945).
// Здесь важны exp/ttl: внешняя система проверяет токен локально по JWKS и обязана
// сама отпустить сессию по истечении exp.
function buildAccessTokenClaims({userId, clientId, scope = '', sessionId = null, ttlSeconds, now = Date.now()}) {
    if (!userId) throw new Error('buildAccessTokenClaims: userId is required');
    if (!clientId) throw new Error('buildAccessTokenClaims: clientId is required');
    const ttl = resolveAccessTokenTtl(ttlSeconds);
    const iat = Math.floor(now / 1000);
    return {
        sub: String(userId),
        aud: String(clientId),
        scope,
        sid: sessionId ? String(sessionId) : undefined,
        iat,
        exp: iat + ttl,
        ttl,
    };
}

module.exports = {
    MIN_ACCESS_TOKEN_TTL_SECONDS,
    MAX_ACCESS_TOKEN_TTL_SECONDS,
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    resolveAccessTokenTtl,
    buildAccessTokenClaims,
};
