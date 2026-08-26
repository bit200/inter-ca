'use strict';

const test = require('node:test');
const assert = require('node:assert');
const shouldOpenBrowser = require('./shouldOpenBrowser');

test('открывает браузер при ручном запуске дев-сервера', () => {
  assert.strictEqual(shouldOpenBrowser({}), true);
  assert.strictEqual(shouldOpenBrowser({ PORT: '8001' }), true);
});

test('не открывает вкладку на каждом перезапуске под pm2', () => {
  assert.strictEqual(shouldOpenBrowser({ pm_id: '8' }), false);
  assert.strictEqual(shouldOpenBrowser({ pm_id: '0' }), false);
  assert.strictEqual(shouldOpenBrowser({ PM2_USAGE: 'CLI' }), false);
  assert.strictEqual(shouldOpenBrowser({ PM2_JSON_PROCESSING: 'true' }), false);
});

test('уважает BROWSER=none и CI', () => {
  assert.strictEqual(shouldOpenBrowser({ BROWSER: 'none' }), false);
  assert.strictEqual(shouldOpenBrowser({ CI: 'true' }), false);
});

test('start.js открывает браузер только через этот предикат', () => {
  const src = require('node:fs').readFileSync(__dirname + '/start.js', 'utf8');
  const call = src.match(/^.*openBrowser\(urls\.localUrlForBrowser\).*$/m);
  assert.ok(call, 'в start.js нет вызова openBrowser');
  assert.match(src, /shouldOpenBrowser\(process\.env\)/);
});
