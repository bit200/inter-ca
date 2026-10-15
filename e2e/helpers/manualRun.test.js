// Юнит-тест защиты от автозапуска e2e. Запуск: npm run test:unit.
const test = require('node:test');
const assert = require('node:assert');
const { assertManualRun } = require('./manualRun');

test('без E2E_MANUAL=1 запуск e2e отклоняется с подсказкой', () => {
  assert.throws(() => assertManualRun({}), /только вручную.*E2E_MANUAL=1/s);
});

test('E2E_MANUAL с другим значением тоже не пускает', () => {
  assert.throws(() => assertManualRun({ E2E_MANUAL: 'true' }), /только вручную/);
  assert.throws(() => assertManualRun({ E2E_MANUAL: '0' }), /только вручную/);
});

test('E2E_MANUAL=1 пускает', () => {
  assert.doesNotThrow(() => assertManualRun({ E2E_MANUAL: '1' }));
});
