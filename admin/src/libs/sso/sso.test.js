import {
    buildAuthorizeUrl, startSsoLogin, readCallback, getLogoutRedirectUrl, makeCodeChallenge,
} from './sso';

const env = {sso: {url: 'http://sso.test/', clientId: 'itk-platform-admin'}};

function memoryStorage() {
    const data = {};
    return {
        getItem: k => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: k => { delete data[k]; },
    };
}

beforeAll(() => {
    const nodeCrypto = require('crypto');
    Object.defineProperty(window, 'crypto', {value: nodeCrypto.webcrypto, configurable: true});
    window.TextEncoder = window.TextEncoder || require('util').TextEncoder;
});

describe('authorize URL', () => {
    test('содержит PKCE S256, state, nonce и redirect_uri', async () => {
        const storage = memoryStorage();
        const url = new URL(await startSsoLogin({env, storage, origin: 'http://app.test', returnTo: '/admin/users'}));
        const q = url.searchParams;
        const saved = JSON.parse(storage.getItem('sso_auth'));

        expect(url.origin + url.pathname).toBe('http://sso.test/auth');
        expect(q.get('response_type')).toBe('code');
        expect(q.get('client_id')).toBe('itk-platform-admin');
        expect(q.get('redirect_uri')).toBe('http://app.test/auth/sso/callback');
        expect(q.get('code_challenge_method')).toBe('S256');
        expect(q.get('code_challenge')).toBe(await makeCodeChallenge(saved.codeVerifier));
        expect(q.get('state')).toBe(saved.state);
        expect(q.get('nonce')).toBe(saved.nonce);
        expect(saved.returnTo).toBe('/admin/users');
    });

    test('code_challenge по RFC 7636', async () => {
        expect(await makeCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'))
            .toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
        expect(buildAuthorizeUrl({ssoUrl: 'http://s/', clientId: 'c', redirectUri: 'r', codeChallenge: 'x', state: 's', nonce: 'n'}))
            .toContain('http://s/auth?');
    });
});

describe('callback', () => {
    async function begin() {
        const storage = memoryStorage();
        await startSsoLogin({env, storage, origin: 'http://app.test', returnTo: '/back'});
        return {storage, saved: JSON.parse(storage.getItem('sso_auth'))};
    }

    test('верный state отдаёт тело для API и маршрут возврата', async () => {
        const {storage, saved} = await begin();
        const r = readCallback({search: `?code=abc&state=${saved.state}`, env, storage, origin: 'http://app.test'});

        expect(r.returnTo).toBe('/back');
        expect(r.body).toEqual({
            code: 'abc', code_verifier: saved.codeVerifier, redirect_uri: 'http://app.test/auth/sso/callback',
            client_id: 'itk-platform-admin', nonce: saved.nonce,
        });
        expect(storage.getItem('sso_auth')).toBeNull();
    });

    test('чужой state — ошибка', async () => {
        const {storage} = await begin();
        expect(() => readCallback({search: '?code=abc&state=evil', env, storage})).toThrow(/state/);
    });

    test('без сохранённого state — ошибка, повторно использовать нельзя', async () => {
        const {storage, saved} = await begin();
        readCallback({search: `?code=a&state=${saved.state}`, env, storage});
        expect(() => readCallback({search: `?code=a&state=${saved.state}`, env, storage})).toThrow(/state/);
    });

    test('error от itk-sso показывается текстом', async () => {
        const {storage, saved} = await begin();
        expect(() => readCallback({search: `?error=access_denied&state=${saved.state}`, env, storage})).toThrow(/access_denied/);
    });
});

describe('логаут', () => {
    test('с id_token ведёт на end_session с id_token_hint и /login', () => {
        const url = new URL(getLogoutRedirectUrl({idToken: 'tok', env, origin: 'http://app.test'}));
        expect(url.origin + url.pathname).toBe('http://sso.test/session/end');
        expect(url.searchParams.get('id_token_hint')).toBe('tok');
        expect(url.searchParams.get('post_logout_redirect_uri')).toBe('http://app.test/login');
    });

    test('без id_token (вход паролем) — старое поведение', () => {
        expect(getLogoutRedirectUrl({idToken: null, env, origin: 'http://app.test'})).toBeNull();
    });
});
