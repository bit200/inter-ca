'use strict';

// Тесты deploy/prod-deploy.sh с подставными git/npm/sudo в PATH: node --test deploy/prodDeploy.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'prod-deploy.sh');
const SHA = 'a'.repeat(39) + '1';
const MASTER_SHA = 'b'.repeat(40);

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-deploy-test-'));
  const app = path.join(root, 'app');
  const bin = path.join(root, 'bin');
  fs.mkdirSync(path.join(app, '.git'), { recursive: true });
  fs.mkdirSync(path.join(app, 'admin', 'build'), { recursive: true });
  fs.mkdirSync(bin);
  const calls = path.join(root, 'calls.log');
  const head = path.join(root, 'head');
  fs.writeFileSync(head, MASTER_SHA);
  const w = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  w('git', `echo "git $*" >> "${calls}"
args=("$@"); [ "\${args[0]}" = "-C" ] && args=("\${args[@]:2}")
case "\${args[0]}" in
  rev-parse) if [ "\${args[1]}" = "--short" ]; then cut -c1-7 "${head}"; else cat "${head}"; fi ;;
  cat-file) [ -z "$FAKE_NO_COMMIT" ] ;;
  checkout|reset) for a in "\${args[@]}"; do [[ "$a" =~ ^[0-9a-f]{40}$ ]] && printf %s "$a" > "${head}"; done; [ -n "$FAKE_WRONG_HEAD" ] && printf %s "${'c'.repeat(40)}" > "${head}"; true ;;
  *) true ;;
esac`);
  w('npm', `echo "npm $*" >> "${calls}"
if [ "$1" = run ]; then mkdir -p "$BUILD_PATH/static/js" && echo x > "$BUILD_PATH/index.html" && echo x > "$BUILD_PATH/static/js/a.js"; fi`);
  w('sudo', `echo "sudo $*" >> "${calls}"`);
  return { root, app, bin, calls };
}

function run(ctx, args, env = {}) {
  return spawnSync('bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    stdin: 'ignore',
    env: { PATH: `${ctx.bin}:${process.env.PATH}`, HOME: ctx.root, APP_DIR: ctx.app, NVM_DIR: path.join(ctx.root, 'nonvm'), ...env },
  });
}

const calls = ctx => fs.readFileSync(ctx.calls, 'utf8');

test('без аргумента катит master и кладёт version.json с полным SHA', () => {
  const ctx = setup();
  const r = run(ctx, []);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(calls(ctx), /reset --hard origin\/master/);
  const v = JSON.parse(fs.readFileSync(path.join(ctx.app, 'admin/build-new/version.json'), 'utf8'));
  assert.strictEqual(v.revision, MASTER_SHA);
  assert.ok(v.builtAt);
  assert.match(r.stdout, new RegExp(`::version ${MASTER_SHA}`));
});

test('с SHA собирает ровно его, маркеры идут по порядку', () => {
  const ctx = setup();
  const r = run(ctx, [SHA]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(calls(ctx), new RegExp(`reset --hard ${SHA}`));
  assert.doesNotMatch(calls(ctx), /origin\/master/);
  const v = JSON.parse(fs.readFileSync(path.join(ctx.app, 'admin/build-new/version.json'), 'utf8'));
  assert.strictEqual(v.revision, SHA);
  const stages = r.stdout.split('\n').filter(l => l.startsWith('::stage')).map(l => l.slice(8));
  assert.deepStrictEqual(stages, ['preflight', 'build', 'deliver']);
  assert.ok(r.stdout.trim().endsWith(`::version ${SHA}`));
  assert.doesNotMatch(calls(ctx), /sudo/);
});

test('APPLY_BUILD=1 вызывает apply и отдаёт этапы switch и health', () => {
  const ctx = setup();
  const r = run(ctx, [SHA], { APPLY_BUILD: '1' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(calls(ctx), /sudo -n \/usr\/local\/sbin\/inter-ca-apply-build\.sh/);
  const stages = r.stdout.split('\n').filter(l => l.startsWith('::stage')).map(l => l.slice(8));
  assert.deepStrictEqual(stages, ['preflight', 'build', 'deliver', 'switch', 'health']);
});

test('короткий или кривой SHA отвергается до любых действий', () => {
  for (const bad of ['abc1234', 'z'.repeat(40), SHA + '0']) {
    const ctx = setup();
    const r = run(ctx, [bad]);
    assert.notStrictEqual(r.status, 0);
    assert.ok(!fs.existsSync(ctx.calls), 'git/npm не должны вызываться');
  }
});

test('неизвестный коммит и расхождение HEAD — отказ без сборки', () => {
  let ctx = setup();
  let r = run(ctx, [SHA], { FAKE_NO_COMMIT: '1' });
  assert.notStrictEqual(r.status, 0);
  assert.doesNotMatch(calls(ctx), /npm run build/);

  ctx = setup();
  r = run(ctx, [SHA], { FAKE_WRONG_HEAD: '1' });
  assert.notStrictEqual(r.status, 0);
  assert.doesNotMatch(calls(ctx), /npm run build/);
});
