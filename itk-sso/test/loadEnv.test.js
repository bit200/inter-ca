'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadEnv, parseEnv } = require('../src/loadEnv');
const { loadConfig } = require('../src/config');

function tmpEnvFile(text) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'itk-sso-env-'));
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, text);
    return file;
}

test('.env: значения доезжают в окружение', () => {
    const file = tmpEnvFile('# комментарий\nPORT=7545\nSSO_ISSUER=http://localhost:7545\n\nSSO_ADMIN_PASSWORD=test\n');
    const env = {};
    const result = loadEnv({ file, env });

    assert.equal(env.PORT, '7545');
    assert.equal(env.SSO_ISSUER, 'http://localhost:7545');
    assert.equal(env.SSO_ADMIN_PASSWORD, 'test');
    assert.equal(result.file, file);
    assert.deepEqual(result.applied.sort(), ['PORT', 'SSO_ADMIN_PASSWORD', 'SSO_ISSUER']);
});

test('.env: прочитанное применяется конфигурацией', () => {
    const file = tmpEnvFile('SSO_TTL_ACCESS=60\nITK_PORTAL_URL=http://localhost:6057\nSSO_DEMO_CLIENT_ID=my-demo\n');
    const env = {};
    loadEnv({ file, env });
    const config = loadConfig(env);

    assert.equal(config.ttl.accessToken, 60);
    assert.equal(config.portal.baseUrl, 'http://localhost:6057');
    assert.equal(config.demo.clientId, 'my-demo');
});

test('.env: настоящее окружение сильнее файла', () => {
    const file = tmpEnvFile('PORT=7545\nSSO_ISSUER=http://localhost:7545\n');
    const env = { PORT: '7600' };
    const result = loadEnv({ file, env });

    assert.equal(env.PORT, '7600', 'PORT=7600 node index.js обязан победить файл');
    assert.equal(env.SSO_ISSUER, 'http://localhost:7545');
    assert.deepEqual(result.skipped, ['PORT']);
});

test('.env: файла нет — не падаем (в docker переменные приходят из compose)', () => {
    const env = {};
    const result = loadEnv({ file: path.join(os.tmpdir(), 'itk-sso-нет-такого', '.env'), env });

    assert.equal(result.file, null);
    assert.deepEqual(result.applied, []);
    assert.deepEqual(env, {});
});

test('.env: разбор строк — кавычки, export, хвостовой комментарий', () => {
    const parsed = parseEnv([
        'export SSO_JWT_KID=itk-sso-1',
        'SSO_RESOURCE_SCOPES=mesh:read,mesh:write # доступные scope',
        'SSO_DEMO_CLIENT_NAME="Демо-приложение ITK"',
        "SSO_SEED_CLIENTS='[{\"client_id\":\"a#b\"}]'",
        'SSO_JWT_PRIVATE_KEY="-----BEGIN-----\\nKEY"',
        'ITK_PORTAL_INTERNAL_TOKEN=',
        'мусор без равно',
    ].join('\n'));

    assert.equal(parsed.SSO_JWT_KID, 'itk-sso-1');
    assert.equal(parsed.SSO_RESOURCE_SCOPES, 'mesh:read,mesh:write');
    assert.equal(parsed.SSO_DEMO_CLIENT_NAME, 'Демо-приложение ITK');
    assert.equal(parsed.SSO_SEED_CLIENTS, '[{"client_id":"a#b"}]');
    assert.equal(parsed.SSO_JWT_PRIVATE_KEY, '-----BEGIN-----\nKEY');
    assert.equal(parsed.ITK_PORTAL_INTERNAL_TOKEN, '');
    assert.equal(Object.keys(parsed).length, 6);
});

test('index.js читает .env до того, как смотрит в process.env', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    const main = source.slice(source.indexOf('require.main === module'));

    assert.match(source, /require\('\.\/src\/loadEnv'\)/, 'загрузчик .env подключён');
    assert.match(main, /loadEnv\(/, 'загрузчик вызывается на старте сервиса');
    assert.ok(
        main.indexOf('loadEnv(') < main.indexOf('process.env'),
        '.env должен применяться раньше первого чтения process.env, иначе файл не доедет',
    );
});
