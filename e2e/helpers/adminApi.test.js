// Юнит-тест уборки e2e-прогона: что и в каком порядке удаляется из базы.
// Запуск: npm run test:unit (node --test, без браузера и стенда).
const test = require('node:test');
const assert = require('node:assert');
const { purgeE2eRun, cleanupStaleE2e, assertSqlRunnerReady } = require('./adminApi');

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
    '/code-history': [{ _id: 8, question: 30 }, { _id: 9, question: 31 }],
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
    '/js-details': [{ _id: 90, question: 30 }, { _id: 91, question: 31 }],
    // Version.sourceId — строка, VersionContribute.sourceId — число.
    '/version': [{ _id: 92, sourceId: '30' }, { _id: 93, sourceId: '31' }],
    '/version-contribute': [{ _id: 94, sourceId: 30 }],
  };
}

test('purgeE2eRun удаляет из базы всё, что завёл прогон, и не трогает чужое', async () => {
  const since = Date.UTC(2026, 9, 15, 12);
  const api = fakeApi(runRows(since));
  await purgeE2eRun(api, RUN, { candidateId: 5, since });

  assert.deepStrictEqual(api.calls, [
    '/quiz-history 1', '/quiz-read-history 3', '/question-user-history 4', '/code-history 8',
    '/course-module-user-history 5', '/course-user 6',
    '/stats-by-second 71', '/vs-session 60', '/vs-session 61',
    '/course 10', '/course-module 20', '/quiz 80', '/quiz 81',
    '/js-details 90', '/version 92', '/version-contribute 94', '/theme-question 30',
    '/vs-task-group 40', '/vs-task 50',
  ]);
  assert.deepStrictEqual(api.rows['/quiz-history'].map((it) => it._id), [2]);
  assert.deepStrictEqual(api.rows['/course-user'].map((it) => it._id), [7]);
  assert.deepStrictEqual(api.rows['/vs-session'].map((it) => it._id), [62]);
  assert.deepStrictEqual(api.rows['/stats-by-second'].map((it) => it._id), [70]);
  assert.deepStrictEqual(api.rows['/quiz'].map((it) => it._id), [82]);
  assert.deepStrictEqual(api.rows['/js-details'].map((it) => it._id), [91]);
  assert.deepStrictEqual(api.rows['/code-history'].map((it) => it._id), [9]);
  assert.deepStrictEqual(api.rows['/version'].map((it) => it._id), [93]);
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

// Раннер проверяется до сборки курса: лежит — падаем сразу, с адресом Postgres и тем,
// как его поднять, а не по таймауту на расчёте эталона.
function statusApi(statuses) {
  const seen = [];
  return {
    seen,
    get: async (path) => {
      seen.push(path);
      return { status: statuses.length > 1 ? statuses.shift() : statuses[0] };
    },
  };
}

test('assertSqlRunnerReady: раннер лежит — ошибка с причиной и fixHint, без ожидания', async () => {
  const api = statusApi([{ ok: false, error: 'connect ECONNREFUSED 127.0.0.1:5439', target: 'localhost:5439', fixHint: 'api/scripts/sql-runner-db.sh' }]);
  const started = Date.now();
  await assert.rejects(assertSqlRunnerReady(api), (e) => {
    assert.match(e.message, /SQL-раннер недоступен/);
    assert.match(e.message, /ECONNREFUSED/);
    assert.match(e.message, /localhost:5439/);
    assert.match(e.message, /sql-runner-db\.sh/);
    return true;
  });
  assert.ok(Date.now() - started < 1000);
  assert.deepStrictEqual(api.seen, ['/sql-runner-status']);
});

test('assertSqlRunnerReady: ждёт первой проверки вотчера (ok: null) и не зовёт docker-m', async () => {
  const api = statusApi([{ ok: null }, { ok: true, target: 'localhost:5439' }]);
  const status = await assertSqlRunnerReady(api, { waitMs: 10_000 });
  assert.strictEqual(status.ok, true);
  assert.deepStrictEqual(api.seen, ['/sql-runner-status', '/sql-runner-status']);
});
