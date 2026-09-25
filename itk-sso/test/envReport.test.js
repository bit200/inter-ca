'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');
const { buildEnvReport, maskUrl, secs } = require('../src/envReport');

function find(report, name) {
    for (const group of report) {
        const found = group.vars.find((v) => v.name === name);
        if (found) return found;
    }
    return null;
}

test('отчёт об окружении: показывает применённое значение и отличает заданное от дефолта', () => {
    const env = { SSO_TTL_ACCESS: '60', SSO_DEMO_CLIENT_ID: 'my-demo' };
    const report = loadConfig(env).envReport;

    assert.equal(find(report, 'SSO_TTL_ACCESS').value, '60 с');
    assert.equal(find(report, 'SSO_TTL_ACCESS').fromEnv, true);
    assert.equal(find(report, 'SSO_DEMO_CLIENT_ID').value, 'my-demo');
    assert.equal(find(report, 'SSO_DEMO_CLIENT_ID').fromEnv, true);

    // Не заданное руками видно как дефолт — иначе непонятно, что именно применилось.
    assert.equal(find(report, 'SSO_TTL_REFRESH').fromEnv, false);
    assert.equal(find(report, 'SSO_TTL_REFRESH').value, '1209600 с (14 дн)');
    assert.equal(find(report, 'ITK_PORTAL_URL').value, 'не задан — вход идёт локальными учётками');
});

test('отчёт об окружении: секретов в нём нет — только «задан»/«не задан»', () => {
    const report = buildEnvReport(
        {
            ITK_PORTAL_INTERNAL_TOKEN: 'портальный-секрет',
            SSO_ADMIN_PASSWORD: 'админский-пароль',
            SSO_COOKIE_KEYS: 'куки-ключ',
            SSO_JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----',
            SSO_DEV_USERS: 'demo:тайный-пароль',
            SSO_MONGO_URL: 'mongodb://user:pass@db:27017',
        },
        loadConfig({
            ITK_PORTAL_INTERNAL_TOKEN: 'портальный-секрет',
            SSO_ADMIN_PASSWORD: 'админский-пароль',
            SSO_COOKIE_KEYS: 'куки-ключ',
            SSO_JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----',
            SSO_DEV_USERS: 'demo:тайный-пароль',
            SSO_MONGO_URL: 'mongodb://user:pass@db:27017',
        }),
    );

    const dump = JSON.stringify(report);
    for (const secret of ['портальный-секрет', 'админский-пароль', 'куки-ключ', 'BEGIN PRIVATE KEY', 'тайный-пароль', 'user:pass']) {
        assert.ok(!dump.includes(secret), `секрет «${secret}» не должен попадать в отчёт`);
    }

    assert.equal(find(report, 'ITK_PORTAL_INTERNAL_TOKEN').value, 'задан');
    assert.equal(find(report, 'SSO_ADMIN_SECRET').value, 'не задан');
    // Логин — не секрет: им и проверяют, что учётка доехала.
    assert.equal(find(report, 'SSO_DEV_USERS').value, 'demo');
    assert.equal(find(report, 'SSO_MONGO_URL').value, 'mongodb://***@db:27017');
});

test('отчёт об окружении: секунды подписаны по-человечески', () => {
    assert.equal(secs(900), '900 с (15 мин)');
    assert.equal(secs(3600), '3600 с (1 ч)');
    assert.equal(secs(45), '45 с');
    assert.equal(maskUrl('mongodb://127.0.0.1:27017'), 'mongodb://127.0.0.1:27017');
});

test('отчёт об окружении: у каждого ресурса видны aud и scope', () => {
    const report = loadConfig({ SSO_RESOURCE_MESH: 'https://mesh.local' }).envReport;
    assert.equal(find(report, 'SSO_RESOURCE_EVALUATE').value, 'https://evaluate.itk.academy (evaluate:run evaluate:docs evaluate:admin)');
    assert.equal(find(report, 'SSO_RESOURCE_EVALUATE').fromEnv, false);
    assert.equal(find(report, 'SSO_RESOURCE_MESH').value, 'https://mesh.local (mesh:read mesh:write)');
    assert.equal(find(report, 'SSO_RESOURCE_MESH').fromEnv, true);
    assert.ok(find(report, 'SSO_RESOURCE_EXTERNAL_API'));
});
