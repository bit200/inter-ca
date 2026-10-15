// Юнит-тест разбора результата SQL-раннера сессии и записи файла решения.
// Запуск: npm run test:unit (node --test, без браузера и стенда).
const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseTestResult, writeFileCmd, sessionResultInfo } = require('./vsSession');

const OK = { runner: 'sql', total: 1, passed: 1, failed: 0, tests: [{ name: 'cnt', status: 'passed' }] };

test('parseTestResult берёт последнюю строку ITK_TEST_RESULT из вывода раннера', () => {
  const out = ['SQL-тесты: 1', `ITK_TEST_RESULT ${JSON.stringify({ ...OK, passed: 0, failed: 1 })}`, 'Итого', `ITK_TEST_RESULT ${JSON.stringify(OK)}`];
  assert.deepStrictEqual(parseTestResult(out), OK);
});

test('parseTestResult склеивает JSON, разрезанный на куски stdout', () => {
  const line = `\u001b[0mITK_TEST_RESULT ${JSON.stringify(OK)}`;
  assert.deepStrictEqual(parseTestResult([line.slice(0, 40), line.slice(40, 70), line.slice(70)]), OK);
});

test('parseTestResult без маркера — null (раннер упал до итога)', () => {
  assert.strictEqual(parseTestResult(['Error: connect ECONNREFUSED']), null);
  assert.strictEqual(parseTestResult(undefined), null);
});

test('sessionResultInfo: статус по коду выхода, как в docker-m full_test_new', () => {
  assert.deepStrictEqual(sessionResultInfo(OK, { code: 0, realArr: ['x'] }), { ...OK, status: 'ok', msg_arr: ['x'] });
  assert.strictEqual(sessionResultInfo({ ...OK, passed: 0, failed: 1 }, { code: 1 }).status, 'error');
});

test('writeFileCmd доносит SQL с кавычками, $ и переводами строк как есть', () => {
  const sql = "-- комментарий\nSELECT COUNT(*) AS \"cnt\" FROM users WHERE name <> '$HOME' AND age > 30;\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-session-test-'));
  try {
    // В контейнере команда выполняется в /home/itk/itk-livecoding — здесь подменяем
    // каталог на временный, сам разбор строки оболочкой тот же.
    const cmd = writeFileCmd('queries/01_query.sql', sql).replace('/home/itk/itk-livecoding', dir);
    fs.mkdirSync(path.join(dir, 'queries'));
    execSync(cmd, { shell: '/bin/sh' });
    assert.strictEqual(fs.readFileSync(path.join(dir, 'queries/01_query.sql'), 'utf8'), sql);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeFileCmd не пускает путь за пределы рабочей папки', () => {
  assert.throws(() => writeFileCmd('../etc/passwd', 'x'), /Недопустимый путь/);
  assert.throws(() => writeFileCmd('/etc/passwd', 'x'), /Недопустимый путь/);
  assert.throws(() => writeFileCmd('a b.sql', 'x'), /Недопустимый путь/);
});
