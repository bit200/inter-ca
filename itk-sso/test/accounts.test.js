'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createAccountService } = require('../src/accounts');

const portal = { baseUrl: 'http://portal.local/', verifyPath: '/internal/verify-credentials', token: 'internal-token', timeoutMs: 0 };

function service(handler) {
    const calls = [];
    const svc = createAccountService({
        portal,
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            return handler(url, options);
        },
    });
    return { svc, calls };
}

test('аккаунты: логин/пароль уходят на POST /internal/verify-credentials портала', async () => {
    const { svc, calls } = service(async () => new Response(JSON.stringify({ userId: 'u-7', roles: ['hr'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
    }));

    const account = await svc.verifyCredentials('ivan', 'secret');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://portal.local/internal/verify-credentials');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.authorization, 'Bearer internal-token');
    assert.deepEqual(JSON.parse(calls[0].options.body), { login: 'ivan', password: 'secret' });
    assert.deepEqual(account, { accountId: 'u-7', roles: ['hr'], claims: { userId: 'u-7', roles: ['hr'] } });
});

test('аккаунты: 401 от портала — это не ошибка сервиса, а отказ во входе', async () => {
    const { svc } = service(async () => new Response('', { status: 401 }));
    assert.equal(await svc.verifyCredentials('ivan', 'нет'), null);
});

test('аккаунты: 500 от портала поднимается наверх как сбой', async () => {
    const { svc } = service(async () => new Response('', { status: 500 }));
    await assert.rejects(() => svc.verifyCredentials('ivan', 'x'), /500/);
});

test('аккаунты: ответ без userId не считается успешным входом', async () => {
    const { svc } = service(async () => new Response(JSON.stringify({ roles: ['hr'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
    }));
    assert.equal(await svc.verifyCredentials('ivan', 'x'), null);
});

test('аккаунты: claims отдаются по запрошенным scope и не больше', async () => {
    const svc = createAccountService({ portal, fetchImpl: async () => new Response('', { status: 401 }) });
    await svc.profiles.set('u-7', { login: 'ivan', name: 'Иван', email: 'i@itk.academy', roles: ['hr'] });

    const account = await svc.findAccount({}, 'u-7');
    assert.deepEqual(await account.claims('id_token', 'openid'), { sub: 'u-7' });
    assert.deepEqual(await account.claims('id_token', 'openid profile roles'), {
        sub: 'u-7', name: 'Иван', preferred_username: 'ivan', roles: ['hr'],
    });
    const withEmail = await account.claims('id_token', 'openid email');
    assert.equal(withEmail.email, 'i@itk.academy');
    assert.equal(withEmail.email_verified, false);
});
