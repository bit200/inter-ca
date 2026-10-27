import {uploadFetch} from './uploadFetch';

describe('uploadFetch', () => {
    let calls;
    const mkUser = () => {
        const u = {t: 'old', get_token: () => u.t, get_refresh_token: () => 'rt', on_refresh_token: (scb) => { u.t = 'new'; scb(); }};
        return u;
    };
    beforeEach(() => { calls = []; });

    it('шлёт токен в Authorization', async () => {
        global.fetch = jest.fn(async (url, o) => { calls.push(o.headers.authorization); return {status: 200}; });
        await uploadFetch('/x', {method: 'POST'}, {user: mkUser()});
        expect(calls).toEqual(['old']);
    });

    it('на 401 обновляет токен и повторяет запрос', async () => {
        global.fetch = jest.fn(async (url, o) => { calls.push(o.headers.authorization); return {status: calls.length === 1 ? 401 : 200}; });
        const res = await uploadFetch('/x', {method: 'POST'}, {user: mkUser()});
        expect(calls).toEqual(['old', 'new']);
        expect(res.status).toBe(200);
    });
});
