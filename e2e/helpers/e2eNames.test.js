// Юнит-тест уборки e2e-сущностей: удалять можно только свои записи и только старые.
// Запуск: npm run test:unit (node --test, без браузера и стенда).
const test = require('node:test');
const assert = require('node:assert');
const { e2eName, e2eNameTs, isStaleE2eName } = require('./e2eNames');

const PREFIX = 'e2e-sql';
const HOUR = 3600 * 1000;
const TS = 1760000000000;

test('e2eName собирает имя с меткой времени и подписью', () => {
  assert.strictEqual(e2eName(PREFIX, TS), 'e2e-sql-1760000000000');
  assert.strictEqual(e2eName(PREFIX, TS, 'курс'), 'e2e-sql-1760000000000 курс');
});

test('e2eNameTs узнаёт только свой префикс с 13-значной меткой', () => {
  assert.strictEqual(e2eNameTs(PREFIX, 'e2e-sql-1760000000000 группа'), TS);
  assert.strictEqual(e2eNameTs(PREFIX, '## e2e-sql-1760000000000 вопрос'), TS);
  assert.strictEqual(e2eNameTs(PREFIX, 'Курс по SQL'), null);
  assert.strictEqual(e2eNameTs(PREFIX, 'мой e2e-sql-1760000000000'), null);
  assert.strictEqual(e2eNameTs(PREFIX, 'e2e-sql-176000000000'), null);
  assert.strictEqual(e2eNameTs(PREFIX, 'e2e-sql-17600000000001'), null);
  assert.strictEqual(e2eNameTs(PREFIX, 'e2e-sqlx-1760000000000'), null);
  assert.strictEqual(e2eNameTs(PREFIX, undefined), null);
});

test('isStaleE2eName: старше порога — да, свежие и чужие — нет', () => {
  assert.strictEqual(isStaleE2eName(PREFIX, e2eName(PREFIX, TS), TS + 7 * HOUR, 6 * HOUR), true);
  assert.strictEqual(isStaleE2eName(PREFIX, e2eName(PREFIX, TS), TS + 5 * HOUR, 6 * HOUR), false);
  assert.strictEqual(isStaleE2eName(PREFIX, 'Боевой курс', TS + 100 * HOUR, 6 * HOUR), false);
});
