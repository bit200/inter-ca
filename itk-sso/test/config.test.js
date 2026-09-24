'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');

test('конфиг: дефолты рассчитаны на локальный стенд', () => {
    const c = loadConfig({});
    assert.equal(c.db.driver, 'memory');
    assert.equal(c.portal.verifyPath, '/internal/verify-credentials');
    assert.equal(c.portal.baseUrl, '', 'адрес портала не угадывается: чужой порт отвечает 404 на проверку пароля');
    assert.equal(loadConfig({ ITK_PORTAL_URL: 'http://portal.local' }).portal.baseUrl, 'http://portal.local');
    assert.equal(c.ttl.accessToken, 900, 'access token живёт коротко');
    assert.ok(c.ttl.refreshToken > c.ttl.accessToken);
    assert.ok(c.scopes.includes('openid'));
});

test('конфиг: mongo включается адресом базы, issuer берётся из окружения', () => {
    const c = loadConfig({ SSO_MONGO_URL: 'mongodb://db:27017', SSO_MONGO_DB: 'sso', SSO_ISSUER: 'https://sso.itk.academy' });
    assert.equal(c.db.driver, 'mongo');
    assert.equal(c.db.name, 'sso');
    assert.equal(c.issuer, 'https://sso.itk.academy');
});

test('конфиг: битый SSO_SEED_CLIENTS падает с понятной ошибкой', () => {
    assert.throws(() => loadConfig({ SSO_SEED_CLIENTS: '{не json' }), /SSO_SEED_CLIENTS/);
});
