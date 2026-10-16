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

// Скрытые данные SQL-задачи: добавляются к USERS только при сдаче. Вера ровно 30 —
// граница «строго старше», Борис — новое имя в начале сортировки.
const HIDDEN_USERS = [
  { id: 5, name: 'Борис', age: 55 },
  { id: 6, name: 'Вера', age: 30 },
];

function seedSql(users = USERS) {
  return `INSERT INTO users VALUES ${users.map((u) => `(${u.id}, '${u.name}', ${u.age})`).join(', ')};`;
}

function countOlder(users = USERS, threshold = THRESHOLD) {
  return users.filter((u) => u.age > threshold).length;
}

// Ожидаемая выборка эталона «имена пользователей старше threshold, по имени»
// (строки по одной колонке name).
function namesOlder(users = USERS, threshold = THRESHOLD) {
  return users.filter((u) => u.age > threshold).map((u) => u.name).sort();
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

// Зачёт проверки знаний курса (#4040, клиент: calcQuizPerc в VsTask/vsTask.js, порог
// QUIZ_NORMAL в CourseQuiz.js): каждое задание проверки — верный квиз или сданная
// js-задача (все кейсы, включая скрытые) — один балл, знаменатель — все задания.
const CHECK_PASS_PERC = 85;

function courseCheckResult(solved) {
  const total = solved.length;
  const quizPerc = Math.round(100 * (solved.filter(Boolean).length / Math.max(total, 1)));
  return { quizPerc, total, status: quizPerc >= CHECK_PASS_PERC ? 'ok' : 'error' };
}

module.exports = {
  USERS, HIDDEN_USERS, THRESHOLD, CHECK_PASS_PERC, seedSql, countOlder, namesOlder, buildQuiz, courseCheckResult,
};
