// Данные сквозного потока sql-course-flow: пользователи для seed SQL-задачи и квиз
// к её вопросу. Квиз строится из тех же пользователей, чтобы верный ответ не мог
// разойтись с seed, а текст вопроса был понятен без доступа к самой задаче.
const THRESHOLD = 30;

const USERS = [
  { id: 1, name: 'Анна', age: 25 },
  { id: 2, name: 'Олег', age: 31 },
  { id: 3, name: 'Ира', age: 42 },
  { id: 4, name: 'Петр', age: 30 },
];

function seedSql(users = USERS) {
  return `INSERT INTO users VALUES ${users.map((u) => `(${u.id}, '${u.name}', ${u.age})`).join(', ')};`;
}

function countOlder(users = USERS, threshold = THRESHOLD) {
  return users.filter((u) => u.age > threshold).length;
}

// Вопрос перечисляет данные и уточняет «строго старше»; верный вариант один,
// остальные — типичные ошибки (>= вместо >, всех пользователей, минус один).
function buildQuiz(users = USERS, threshold = THRESHOLD) {
  const correct = countOlder(users, threshold);
  const wrong = [
    users.filter((u) => u.age >= threshold).length,
    users.length,
    correct + 2,
    Math.max(correct - 1, 0),
  ].filter((n, i, all) => n !== correct && all.indexOf(n) === i).slice(0, 2);
  const list = users.map((u) => `${u.name} — ${u.age}`).join(', ');
  return {
    name: `В таблице users записаны: ${list}. Сколько пользователей строго старше ${threshold} лет?`,
    variants: [correct, ...wrong].map((n) => ({ text: String(n), isCorrect: n === correct })),
  };
}

module.exports = { USERS, THRESHOLD, seedSql, countOlder, buildQuiz };
