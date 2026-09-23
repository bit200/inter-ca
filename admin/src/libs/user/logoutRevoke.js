// Логаут на портале должен гасить сессию и во внешних системах, вошедших
// «через ITK». Back-channel push им не рассылается: портал только просит
// itk-sso пометить refresh token(ы) отозванными, а уже выданный access token
// доживает свой короткий TTL (5–15 минут) — дальше внешняя система обновиться
// не сможет и потеряет сессию сама, без своего logout-webhook.
//
// Выход пользователя не должен зависеть от доступности itk-sso, поэтому вызов
// fire-and-forget: любая ошибка глотается, промис всегда резолвится.
export function revokeSessionOnLogout(http, refresh_token) {
    if (!http || typeof http.post !== 'function') return Promise.resolve(false);
    if (!refresh_token) return Promise.resolve(false);
    try {
        const p = http.post('/auth/logout', {refresh_token});
        if (!p || typeof p.then !== 'function') return Promise.resolve(true);
        return p.then(() => true, () => false);
    } catch (e) {
        return Promise.resolve(false);
    }
}

export default revokeSessionOnLogout;
