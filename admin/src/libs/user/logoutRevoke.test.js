import {revokeSessionOnLogout} from './logoutRevoke';

describe('revokeSessionOnLogout', () => {
    test('шлёт refresh token на отзыв в itk-sso', async () => {
        const calls = [];
        const http = {post: (url, body) => { calls.push([url, body]); return Promise.resolve({}); }};

        await expect(revokeSessionOnLogout(http, 'rt-1')).resolves.toBe(true);
        expect(calls).toEqual([['/auth/logout', {refresh_token: 'rt-1'}]]);
    });

    test('без refresh token никуда не ходит', async () => {
        const http = {post: jest.fn()};

        await expect(revokeSessionOnLogout(http, null)).resolves.toBe(false);
        expect(http.post).not.toHaveBeenCalled();
    });

    test('недоступный itk-sso не ломает логаут', async () => {
        const http = {post: () => Promise.reject(new Error('502'))};

        await expect(revokeSessionOnLogout(http, 'rt-1')).resolves.toBe(false);
    });

    test('синхронное исключение тоже не ломает логаут', async () => {
        const http = {post: () => { throw new Error('boom'); }};

        await expect(revokeSessionOnLogout(http, 'rt-1')).resolves.toBe(false);
    });
});
