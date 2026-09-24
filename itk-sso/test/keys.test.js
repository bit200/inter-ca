'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { buildJwks } = require('../src/keys');

test('ключи: RS256, публичный JWKS без приватной части', () => {
    const { jwks, publicJwks, kid, generated } = buildJwks({ kid: 'itk-test' });
    assert.equal(generated, true);
    assert.equal(kid, 'itk-test');
    assert.equal(jwks.keys[0].alg, 'RS256');
    assert.ok(jwks.keys[0].d, 'приватный JWK нужен провайдеру для подписи');
    assert.equal(publicJwks.keys.length, 1);
    assert.equal(publicJwks.keys[0].kid, 'itk-test');
    assert.equal(publicJwks.keys[0].use, 'sig');
    for (const secret of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
        assert.equal(publicJwks.keys[0][secret], undefined, `в JWKS не должно быть поля ${secret}`);
    }
});

test('ключи: ключ из окружения используется как есть', () => {
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
    const built = buildJwks({ privateKeyPem: pem, kid: 'env-key' });
    assert.equal(built.generated, false);
    const expected = crypto.createPublicKey(pair.privateKey).export({ format: 'jwk' });
    assert.equal(built.publicJwks.keys[0].n, expected.n);
});

test('ключи: не-RSA ключ отбивается', () => {
    const pair = crypto.generateKeyPairSync('ed25519');
    const pem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
    assert.throws(() => buildJwks({ privateKeyPem: pem }), /RS256/);
});

test('ключи: файла ключа нет — на стенде генерируем временный, а не падаем', () => {
    const warnings = [];
    const built = buildJwks(
        { privateKeyFile: './keys/нет-такого.pem', kid: 'itk-sso-1' },
        { env: {}, log: { warn: (m) => warnings.push(String(m)) } },
    );
    assert.equal(built.generated, true);
    assert.match(warnings.join('\n'), /временный/);
});

test('ключи: в production отсутствие файла ключа по-прежнему валит старт', () => {
    assert.throws(
        () => buildJwks({ privateKeyFile: './keys/нет-такого.pem' }, { env: { NODE_ENV: 'production' } }),
        /не найден/,
    );
});
