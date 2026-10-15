// Юнит-тест уборки e2e-прогона: что и в каком порядке удаляется из базы.
// Запуск: npm run test:unit (node --test, без браузера и стенда).
const test = require('node:test');
const assert = require('node:assert');
const { purgeE2eRun, cleanupStaleE2e } = require('./adminApi');

// Фейковый API админа: listAll отдаёт записи «базы» по фильтру/поиску, purge их удаляет.
function fakeApi(rows) {
  const calls = [];
  const matches = (it, params = {}) => {
    if (params.search && !String(it.name || '').includes(params.search)) return false;
    return Object.entries(params.filter || {}).every(([k, v]) => String(it[k]) === String(v));
  };
  return {
    calls,
    rows,
    listAll: async (path, params) => (rows[path] || []).filter((it) => matches(it, params)),
    purge: async (path, _id) => {
      calls.push(`${path} ${_id}`);
      rows[path] = (rows[path] || []).filter((it) => it._id !== _id);
    },
    del: async () => assert.fail('мягкий DELETE в уборке не используется'),
  };
}

const RUN = { courses: [10], modules: [20], questions: [30], groups: [40], tasks: [50], sessions: [60] };

function runRows(since) {
  return {
    '/quiz-history': [{ _id: 1, question: 30 }, { _id: 2, question: 999 }],
    '/quiz-read-history': [{ _id: 3, question: 30 }],
    '/question-user-history': [{ _id: 4, question: 30 }],
    '/course-module-user-history': [{ _id: 5, courseModule: 20 }],
    '/course-user': [{ _id: 6, course: 10 }, { _id: 7, course: 11 }],
    '/vs-session': [
      { _id: 60, user: '5', info: { task_group_id: 40 } },
      // Сессия прогона, чей _id в flow не попал, и чужая сессия того же кандидата.
      { _id: 61, user: '5', info: { task_group_id: 40 } },
      { _id: 62, user: '5', info: { task_group_id: 41 } },
    ],
    '/stats-by-second': [
      { _id: 70, user: 5, cd: new Date(since - 1000).toISOString() },
      { _id: 71, user: 5, cd: new Date(since + 1000).toISOString() },
    ],
    '/quiz': [{ _id: 80, question: 30 }, { _id: 81, question: 30, is_removed: true }, { _id: 82, question: 31 }],
  };
}

test('purgeE2eRun удаляет из базы всё, что завёл прогон, и не трогает чужое', async () => {
  const since = Date.UTC(2026, 9, 15, 12);
  const api = fakeApi(runRows(since));
  await purgeE2eRun(api, RUN, { candidateId: 5, since });

  assert.deepStrictEqual(api.calls, [
    '/quiz-history 1', '/quiz-read-history 3', '/question-user-history 4',
    '/course-module-user-history 5', '/course-user 6',
    '/stats-by-second 71', '/vs-session 60', '/vs-session 61',
    '/course 10', '/course-module 20', '/quiz 80', '/quiz 81', '/theme-question 30',
    '/vs-task-group 40', '/vs-task 50',
  ]);
  assert.deepStrictEqual(api.rows['/quiz-history'].map((it) => it._id), [2]);
  assert.deepStrictEqual(api.rows['/course-user'].map((it) => it._id), [7]);
  assert.deepStrictEqual(api.rows['/vs-session'].map((it) => it._id), [62]);
  assert.deepStrictEqual(api.rows['/stats-by-second'].map((it) => it._id), [70]);
  assert.deepStrictEqual(api.rows['/quiz'].map((it) => it._id), [82]);
});

test('purgeE2eRun пропускает то, что упавший прогон не успел создать', async () => {
  const api = fakeApi({});
  await purgeE2eRun(api, { courses: [undefined], tasks: [50], sessions: [] });
  assert.deepStrictEqual(api.calls, ['/vs-task 50']);
});

test('cleanupStaleE2e убирает старые прогоны, включая мягко удалённые, и не трогает свежие и чужие', async () => {
  const now = Date.UTC(2026, 9, 15, 12);
  const old = now - 7 * 3600 * 1000;
  const api = fakeApi({
    '/course': [
      { _id: 10, name: `e2e-sql-${old} курс`, is_removed: true },
      { _id: 11, name: `e2e-sql-${now - 1000} курс` },
      { _id: 12, name: 'Курс SQL' },
    ],
    '/course-user': [{ _id: 6, course: 10 }],
    '/vs-task': [{ _id: 50, name: `e2e-sql-${old} задача` }],
  });
  await cleanupStaleE2e(api, { prefix: 'e2e-sql', maxAgeMs: 6 * 3600 * 1000, now });
  assert.deepStrictEqual(api.calls, ['/course-user 6', '/course 10', '/vs-task 50']);
});
