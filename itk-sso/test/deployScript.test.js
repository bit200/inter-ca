'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../src/config');
const { startService } = require('./oidcHelpers');

const root = path.join(__dirname, '..');
const deploySh = fs.readFileSync(path.join(root, 'deploy.sh'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

/** Комментарии рассказывают про соседние сервисы, а связывает с ними только код. */
function code(text) {
    return text.replace(/^\s*#.*$/gm, '');
}

/** Пути, которые deploy.sh считает признаком живого стека. */
function healthcheckTargets() {
    const re = /wait_for_http\s+(\S+)\s+"http:\/\/127\.0\.0\.1:\$\{SSO_PORT\}([^"]*)"\s+(\d+)/g;
    return [...deploySh.matchAll(re)].map(([, name, urlPath, code]) => ({ name, path: urlPath, code: Number(code) }));
}

test('deploy.sh: исполняемый bash-скрипт с остановкой на первой ошибке', () => {
    assert.ok(fs.statSync(path.join(root, 'deploy.sh')).mode & 0o111, 'deploy.sh должен быть исполняемым');
    assert.match(deploySh, /^#!\/usr\/bin\/env bash/, 'shebang bash');
    assert.match(deploySh, /set -euo pipefail/);
});

test('deploy.sh: раскатывает новый коммит и откатывается на предыдущий при неудаче', () => {
    assert.match(deploySh, /PREVIOUS_COMMIT="\$\(git rev-parse HEAD\)"/, 'предыдущий коммит запоминается ДО git pull');
    assert.ok(
        code(deploySh).indexOf('PREVIOUS_COMMIT=') < code(deploySh).search(/^git pull$/m),
        'коммит запоминается раньше, чем подтягивается новый код',
    );
    assert.match(deploySh, /git reset --hard "\$\{PREVIOUS_COMMIT\}"/, 'откат на предыдущий коммит');
    assert.equal(
        (deploySh.match(/docker compose up -d --build/g) || []).length,
        2,
        'пересборка нужна и на деплое, и на откате',
    );
    assert.match(deploySh, /docker compose logs --tail/, 'перед откатом показываем логи упавшего стека');
});

test('deploy.sh: независим от itk-platform-en — свой compose и свой .env рядом', () => {
    assert.doesNotMatch(code(deploySh), /itk-platform-en|interviews\/api|\.\.\//, 'скрипт не должен лазить за пределы своего каталога');
    assert.match(deploySh, /cd "\$\(dirname "\$0"\)"/, 'работаем из каталога сервиса');
    assert.match(deploySh, /if \[ ! -f \.env \]/, 'без .env деплой останавливается с подсказкой');
    for (const file of ['docker-compose.yml', 'Dockerfile', '.dockerignore', '.env.example']) {
        assert.ok(fs.existsSync(path.join(root, file)), `${file} должен лежать рядом с deploy.sh`);
    }
});

test('deploy.sh: порт по умолчанию совпадает с дефолтом конфигурации сервиса', () => {
    const fallback = deploySh.match(/SSO_PORT="\$\{SSO_PORT:-(\d+)\}"/);
    assert.ok(fallback, 'у SSO_PORT есть дефолт');
    assert.equal(Number(fallback[1]), loadConfig({}).port, 'дефолт deploy.sh и src/config.js разъехались');
    assert.match(deploySh, /env_value \.env PORT/, 'порт читается из того же .env, что и docker compose');
    assert.match(deploySh, /export PORT="\$\{SSO_PORT\}"/, 'PORT из .env навязывается compose: переменная шелла иначе победит');
    assert.match(envExample, /^PORT=\d+$/m);
});

test('.env.example: парный секрет портала назван обоими именами — своим и портальным', () => {
    // Пустой ITK_SSO_INTERNAL_TOKEN на портале закрывает verify-credentials (503), и
    // пароль вообще не проверяется. Кто этого не знает, ищет поломку у себя: из одного
    // ITK_PORTAL_INTERNAL_TOKEN= не видно, что то же значение надо положить на портал.
    const block = envExample.match(/(?:^#.*\n)*^ITK_PORTAL_INTERNAL_TOKEN=.*$/m);
    assert.ok(block, 'ITK_PORTAL_INTERNAL_TOKEN должен быть в .env.example');
    assert.match(block[0], /ITK_SSO_INTERNAL_TOKEN/, 'рядом названо имя той же переменной на портале');
    assert.match(readme, /ITK_SSO_INTERNAL_TOKEN/, 'README объясняет, где на портале задаётся парный секрет');
});

test('docker-compose.yml: сервис sso собирается из своего Dockerfile и пробрасывает PORT', () => {
    assert.match(compose, /^\s{2}sso:/m);
    assert.match(compose, /env_file:\s*\n\s*- \.env/);
    assert.match(compose, /- "\$\{SSO_BIND_ADDR:-127\.0\.0\.1\}:\$\{PORT:-7545\}:\$\{PORT:-7545\}"/, 'наружу и внутрь — один и тот же порт');
    assert.match(compose, /- \.\/data:\/app\/data/, 'реестр клиентов переживает пересборку');
    assert.match(compose, /- \.\/keys:\/app\/keys/, 'ключ подписи лежит на хосте, иначе токены умрут при рестарте');
    assert.match(compose, /^\s{2}mongo:/m, 'своя база — смысл независимого деплоя');
    assert.doesNotMatch(code(compose), /itk-platform-en|interviews\/|\.\.\//, 'стек собирается только из своего каталога');
});

test('health-check deploy.sh: все проверяемые пути реально отвечают ожидаемым кодом', async () => {
    const targets = healthcheckTargets();
    assert.ok(targets.length > 0, 'в deploy.sh должен быть хотя бы один health-check');
    assert.ok(targets.some((t) => t.path === '/healthz'), '/healthz — дешёвая проверка, что процесс поднялся');

    const svc = await startService();
    try {
        for (const target of targets) {
            const res = await fetch(`${svc.base}${target.path}`);
            assert.equal(res.status, target.code, `health-check ${target.name}: ${target.path} ответил ${res.status}`);
        }
    } finally {
        await svc.stop();
    }
});
