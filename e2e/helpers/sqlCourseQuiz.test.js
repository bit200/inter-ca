const test = require('node:test');
const assert = require('node:assert');
const { USERS, seedSql, countOlder, buildQuiz } = require('./sqlCourseQuiz');

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
