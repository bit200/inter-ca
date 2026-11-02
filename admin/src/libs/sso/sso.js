// Вход через itk-sso: Authorization Code + PKCE (S256), state и nonce.
// Чистые функции принимают storage/env параметрами, чтобы их можно было проверять без браузера.

const STORAGE_KEY = 'sso_auth';

export const CALLBACK_PATH = '/auth/sso/callback';

function toBase64Url(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(byteCount = 32) {
    const bytes = new Uint8Array(byteCount);
    window.crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
}

export async function makeCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return toBase64Url(new Uint8Array(digest));
}

export function isSsoConfigured(env = window.env) {
    return !!(env && env.sso && env.sso.url && env.sso.clientId);
}

export function getRedirectUri(origin = window.location.origin) {
    return origin + CALLBACK_PATH;
}

export function buildAuthorizeUrl({ssoUrl, clientId, redirectUri, codeChallenge, state, nonce}) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
    });
    return ssoUrl.replace(/\/+$/, '') + '/auth?' + params.toString();
}

export function buildEndSessionUrl({ssoUrl, idToken, postLogoutRedirectUri}) {
    const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: postLogoutRedirectUri,
    });
    return ssoUrl.replace(/\/+$/, '') + '/session/end?' + params.toString();
}

// Адрес выхода из itk-sso. null — пользователь вошёл паролем (нет id_token)
// или SSO не настроен: достаточно старого поведения.
export function getLogoutRedirectUrl({idToken, env = window.env, origin = window.location.origin}) {
    if (!idToken || !isSsoConfigured(env)) return null;
    return buildEndSessionUrl({
        ssoUrl: env.sso.url,
        idToken,
        postLogoutRedirectUri: origin + '/login',
    });
}

export async function startSsoLogin({env = window.env, storage = window.sessionStorage, returnTo = '/', origin = window.location.origin} = {}) {
    if (!isSsoConfigured(env)) throw new Error('Вход через ITK не настроен');

    const codeVerifier = randomString(48);
    const state = randomString(24);
    const nonce = randomString(24);
    const codeChallenge = await makeCodeChallenge(codeVerifier);

    storage.setItem(STORAGE_KEY, JSON.stringify({codeVerifier, state, nonce, returnTo}));

    return buildAuthorizeUrl({
        ssoUrl: env.sso.url,
        clientId: env.sso.clientId,
        redirectUri: getRedirectUri(origin),
        codeChallenge,
        state,
        nonce,
    });
}

// Разбирает ответ itk-sso на callback: проверяет state и возвращает тело для POST /auth/sso/callback.
// Запись из sessionStorage одноразовая — удаляется при любом исходе.
export function readCallback({search, env = window.env, storage = window.sessionStorage, origin = window.location.origin}) {
    const params = new URLSearchParams(search);
    let saved = null;
    try {
        saved = JSON.parse(storage.getItem(STORAGE_KEY));
    } catch (e) {
        saved = null;
    }
    storage.removeItem(STORAGE_KEY);

    if (params.get('error')) {
        throw new Error('itk-sso отказал во входе: ' + (params.get('error_description') || params.get('error')));
    }
    if (!saved || !saved.state || params.get('state') !== saved.state) {
        throw new Error('Не удалось проверить state: начните вход через ITK заново');
    }
    if (!params.get('code')) {
        throw new Error('itk-sso не вернул code: начните вход через ITK заново');
    }

    return {
        body: {
            code: params.get('code'),
            code_verifier: saved.codeVerifier,
            redirect_uri: getRedirectUri(origin),
            client_id: env.sso.clientId,
            nonce: saved.nonce,
        },
        returnTo: saved.returnTo || '/',
    };
}
