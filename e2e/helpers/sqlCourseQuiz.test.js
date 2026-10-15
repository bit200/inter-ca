const test = require('node:test');
const assert = require('node:assert');
const {
  USERS, HIDDEN_USERS, seedSql, countOlder, namesOlder, buildQuiz, courseCheckResult,
} = require('./sqlCourseQuiz');

test('seed содержит всех пользователей', () => {
  assert.strictEqual(
    seedSql(),
    "INSERT INTO users VALUES (1, 'Анна', 25), (2, 'Олег', 31), (3, 'Ира', 42), (4, 'Петр', 30);",
  );
});

test('квиз самодостаточен: в тексте есть данные и слово «строго»', () => {
  const { name } = buildQuiz();
  for (const u of USERS) assert.ok(name.includes(`${u.name} — ${u.age}`), u.name);
  assert.match(name, /строго старше 30/);
  assert.doesNotMatch(name, /seed/);
});

test('квиз валиден: ≥3 варианта, один верный, он совпадает с подсчётом', () => {
  const { variants } = buildQuiz();
  assert.ok(variants.length >= 3);
  const ok = variants.filter((v) => v.isCorrect);
  assert.strictEqual(ok.length, 1);
  assert.strictEqual(ok[0].text, String(countOlder()));
  assert.strictEqual(new Set(variants.map((v) => v.text)).size, variants.length);
});

test('эталон «имена старше 30 по имени»: скрытые данные меняют выборку, граница 30 не входит', () => {
  assert.deepStrictEqual(namesOlder(), ['Ира', 'Олег']);
  assert.deepStrictEqual(namesOlder([...USERS, ...HIDDEN_USERS]), ['Борис', 'Ира', 'Олег']);
  assert.strictEqual(seedSql(HIDDEN_USERS), "INSERT INTO users VALUES (5, 'Борис', 55), (6, 'Вера', 30);");
});

test('зачёт проверки: квиз и SQL-задача по баллу, порог 85% — одна ошибка из двух не проходит', () => {
  assert.deepStrictEqual(courseCheckResult([true, true]), { quizPerc: 100, total: 2, status: 'ok' });
  assert.deepStrictEqual(courseCheckResult([true, false]), { quizPerc: 50, total: 2, status: 'error' });
  assert.deepStrictEqual(courseCheckResult([false, false]), { quizPerc: 0, total: 2, status: 'error' });
  // 6 из 7 = 86% — порог пройден, 5 из 6 = 83% — нет.
  assert.strictEqual(courseCheckResult([...Array(6).fill(true), false]).status, 'ok');
  assert.strictEqual(courseCheckResult([...Array(5).fill(true), false]).status, 'error');
});
