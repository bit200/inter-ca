// API itk-platform под админом: проверки стенда, чтение созданного через UI и уборка
// e2e-мусора. Сами сущности тесты заводят через UI админки, сюда — только то, что
// UI не показывает (статус сборки, итоговые поля) или что не должно зависеть от UI
// (удаление старых прогонов).
const { request } = require('@playwright/test');
const { API_URL, adminCreds } = require('./env');
const { isStaleE2eName } = require('./e2eNames');

// Плоский query-string в формате qs (express): filter[question]=5, filters[]=name.
function toQuery(params, prefix, out = []) {
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${Array.isArray(params) ? '' : key}]` : key;
    if (typeof value === 'object') {
      toQuery(value, name, out);
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    }
  }
  return out.join('&');
}

async function body(res, what) {
  const text = await res.text();
  if (!res.ok()) {
    throw new Error(`${what}: HTTP ${res.status()} ${text.slice(0, 300)}`);
  }
  const json = text ? JSON.parse(text) : {};
  // m.scb оборачивает ответ в {data}, как и разворачивает его http-клиент админки.
  return json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
}

async function login(ctx, { username, password }) {
  const res = await ctx.post('/api/auth/login', { data: { username, password } });
  const data = await body(res, `Логин ${username} в ${API_URL}`);
  if (!data.token) {
    throw new Error(`Логин ${username}: в ответе нет token`);
  }
  return data;
}

// API от имени пользователя: админ (уборка, чтение того, что UI не показывает)
// или кандидат (его собственные сессии и история — /populated-session и т.п.).
async function createUserApi(creds) {
  const ctx = await request.newContext({ baseURL: API_URL });
  const { token, user } = await login(ctx, creds);
  const headers = { Authorization: token };

  const api = {
    user,
    token,
    get: async (path, params) => body(await ctx.get(`/api${path}${params ? '?' + toQuery(params) : ''}`, { headers }), `GET ${path}`),
    post: async (path, data) => body(await ctx.post(`/api${path}`, { headers, data }), `POST ${path}`),
    put: async (path, item) => body(await ctx.put(`/api${path}`, { headers, data: { item } }), `PUT ${path}`),
    del: async (path, _id) => body(await ctx.delete(`/api${path}`, { headers, data: { _id } }), `DELETE ${path} ${_id}`),
    one: async (path, _id) => api.get(`${path}/${_id}`),
    findByName: async (path, search) => (await api.get(path, { search, filters: ['name'], per_page: 1000 })).items || [],
    dispose: () => ctx.dispose(),
  };
  return api;
}

const createAdminApi = () => createUserApi(adminCreds());

// Пользователь по логину — нужен _id кандидата для записи на курс. Сам API логина
// отдаёт пользователя, так что пароль кандидата здесь же и проверяется.
async function loginUser(creds) {
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    return await login(ctx, creds);
  } finally {
    await ctx.dispose();
  }
}

// Сборка SQL-задачи ходит в Postgres раннера (эталонный результат) и в docker-m
// (файлы задачи). Если что-то из этого лежит, тест должен упасть сразу и сказать,
// что поднять, а не висеть до таймаута сборки.
async function assertSqlBuildReady(api, { waitMs = 40_000 } = {}) {
  const started = Date.now();
  let status = null;
  // ok === null — вотчер API ещё ни разу не проверял сервер (первые секунды после
  // старта API), он делает это раз в 30 с.
  while (Date.now() - started < waitMs) {
    status = (await api.get('/sql-runner-status')).status || {};
    if (status.ok !== null && status.ok !== undefined) break;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  if (!status || status.ok !== true) {
    throw new Error(
      `SQL-раннер недоступен (GET /api/sql-runner-status): ${status && status.error ? status.error : 'статус не определён'}. ` +
      `Postgres раннера: ${status && status.target ? status.target : 'SQL_RUNNER_DSN'}; поднять: ${status && status.fixHint ? status.fixHint : 'api/scripts/sql-runner-db.sh'}`
    );
  }
  const built = await api.get('/vs-image/built');
  if (built && built.err_obj) {
    throw new Error(
      `docker-m недоступен (GET /api/vs-image/built → ${built.err_obj.msg || JSON.stringify(built.err_obj)}). ` +
      'Сборка файлов SQL-задачи идёт через docker-m на :3010 — поднимите его.'
    );
  }
}

// Ждём итог сборки файлов SQL-задачи: 'ok' — дальше, 'error' — падаем сразу с текстом
// ошибки сборки, а не по таймауту.
async function waitSqlSync(api, taskId, { timeoutMs = 120_000, intervalMs = 2_000 } = {}) {
  const started = Date.now();
  let sync = null;
  while (Date.now() - started < timeoutMs) {
    const task = await api.one('/vs-task', taskId);
    sync = (task.info || {}).sql_quick_sync || null;
    if (sync && sync.status === 'ok') return task;
    if (sync && sync.status === 'error') {
      throw new Error(`Сборка файлов SQL-задачи #${taskId} упала: ${sync.error || 'без описания'}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Сборка файлов SQL-задачи #${taskId} не закончилась за ${timeoutMs / 1000} с (последний статус: ${sync ? sync.status : 'нет'})`);
}

// Уборка: всё с нашим префиксом в имени старше maxAgeMs. Ничего без префикса не
// трогаем — так курсы и данные реальных пользователей остаются как есть. Порядок —
// от зависимых к базовым: запись кандидата, курс, модуль, квизы вопроса, вопрос,
// группа, задача. DELETE в CRUD — мягкий (is_removed), списки их уже не показывают.
async function cleanupStaleE2e(api, { prefix, maxAgeMs, candidateId, now = Date.now(), log = () => {} }) {
  const stale = async (path) => (await api.findByName(path, prefix)).filter((it) => isStaleE2eName(prefix, it.name, now, maxAgeMs));
  const removed = {};
  const note = (path, _id) => {
    (removed[path] = removed[path] || []).push(_id);
  };

  for (const course of await stale('/course')) {
    if (candidateId) {
      await api.post('/remove-user-course', { user: candidateId, course: course._id }).catch(() => {});
    }
    await api.del('/course', course._id);
    note('/course', course._id);
  }
  for (const mod of await stale('/course-module')) {
    await api.del('/course-module', mod._id);
    note('/course-module', mod._id);
  }
  for (const q of await stale('/theme-question')) {
    const quizzes = (await api.get('/quiz', { filter: { question: q._id }, per_page: 1000 })).items || [];
    for (const quiz of quizzes) {
      await api.del('/quiz', quiz._id);
      note('/quiz', quiz._id);
    }
    await api.del('/theme-question', q._id);
    note('/theme-question', q._id);
  }
  for (const group of await stale('/vs-task-group')) {
    await api.del('/vs-task-group', group._id);
    note('/vs-task-group', group._id);
  }
  for (const task of await stale('/vs-task')) {
    await api.del('/vs-task', task._id);
    note('/vs-task', task._id);
  }
  log(`cleanup ${prefix}: ${JSON.stringify(removed)}`);
  return removed;
}

module.exports = { createAdminApi, createUserApi, loginUser, assertSqlBuildReady, waitSqlSync, cleanupStaleE2e, toQuery };
