// Сквозной поток платформы: SQL-задача → группа → вопрос → модуль → курс → кандидат.
// Часть 1 — подготовка через UI админки itk-platform (E2E_ADMIN_URL). Часть 2 —
// прохождение курса кандидатом в клиенте (E2E_BASE_URL) — допишется в этот же файл
// следующим test-блоком: describe.serial гарантирует порядок, а созданные _id лежат
// в общем объекте `flow` (и дублируются в test-results/sql-course-flow.json для
// разбора прогона).
//
// Сервисы, env и как завести тестовых пользователей — e2e/README.md, раздел
// «Сквозной поток sql-course-flow».
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ADMIN_URL, adminCreds, candidateCreds } = require('../helpers/env');
const { loginAdmin } = require('../helpers/auth');
const { e2eName } = require('../helpers/e2eNames');
const {
  createAdminApi, loginUser, assertSqlBuildReady, waitSqlSync, cleanupStaleE2e,
} = require('../helpers/adminApi');

const PREFIX = 'e2e-sql';
// Старше этого — мусор прошлых прогонов, удаляем перед стартом.
const CLEANUP_HOURS = Number(process.env.E2E_CLEANUP_HOURS || 6);
// Сборка файлов SQL-задачи: эталон в Postgres раннера + docker-m. Обычно 5–20 с.
const SQL_SYNC_TIMEOUT = 120_000;

const SQL = {
  description: 'Посчитайте пользователей старше 30 лет. Верните одну колонку `cnt`.',
  schema: 'CREATE TABLE users (\n  id   int PRIMARY KEY,\n  name text NOT NULL,\n  age  int NOT NULL\n);',
  seed: "INSERT INTO users VALUES (1, 'Анна', 25), (2, 'Олег', 31), (3, 'Ира', 42), (4, 'Петр', 30);",
  solution: 'SELECT COUNT(*) AS cnt FROM users WHERE age > 30;',
};

const flow = { ts: Date.now() };
flow.name = (suffix) => e2eName(PREFIX, flow.ts, suffix);

function saveFlow(testInfo) {
  const file = path.join(testInfo.project.outputDir || 'test-results', 'sql-course-flow.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const { name, ...data } = flow;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Создание через модалку «Создать запись» движка Table: _id новой записи UI не
// показывает (после POST список просто перечитывается), поэтому берём его из ответа.
async function submitCreate(page, apiPath) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api${apiPath}`),
    page.locator('[data-testid="table-modal"] #table-modal-submit').click(),
  ]);
  expect(res.ok(), `POST /api${apiPath}`).toBeTruthy();
  const json = await res.json();
  const item = json.data || json;
  expect(item._id, `POST /api${apiPath} вернул _id`).toBeTruthy();
  await expect(page.locator('[data-testid="table-modal"]')).toHaveCount(0);
  return item;
}

function waitPut(page, apiPath, predicate = () => true) {
  return page.waitForResponse((r) => r.request().method() === 'PUT'
    && new URL(r.url()).pathname === `/api${apiPath}` && predicate(r.request().postDataJSON() || {}));
}

test.describe.serial('sql-course-flow', () => {
  /** @type {import('@playwright/test').Page} */
  let page;
  let api;

  test.beforeAll(async ({ browser }) => {
    api = await createAdminApi();
    const { user } = await loginUser(candidateCreds());
    flow.candidate = { _id: user._id, username: user.username };
    await cleanupStaleE2e(api, {
      prefix: PREFIX,
      maxAgeMs: CLEANUP_HOURS * 3600 * 1000,
      candidateId: flow.candidate._id,
      log: (m) => console.log(m),
    });
    page = await browser.newPage();
    await loginAdmin(page, { adminUrl: ADMIN_URL, ...adminCreds() });
  });

  test.afterAll(async () => {
    await page?.close();
    await api?.dispose();
  });

  test.afterEach(async ({}, testInfo) => saveFlow(testInfo));

  test.describe('admin setup', () => {
    test('1. SQL-задача через быструю форму', async () => {
      test.setTimeout(SQL_SYNC_TIMEOUT + 60_000);
      await assertSqlBuildReady(api);

      await page.goto(`${ADMIN_URL}/vs-task`);
      await page.locator('[data-testid="table-add-button"]').click();
      const modal = page.locator('[data-testid="table-modal"]');
      await modal.locator('[data-testid="stq-type-sql"]').click();
      await expect(modal.locator('[data-testid="stq-type-sql"]')).toHaveAttribute('aria-checked', 'true');

      await modal.locator('[data-testid="stq-field-title"]').fill(flow.name('SQL: пользователи старше 30'));
      await modal.locator('[data-testid="stq-field-description"]').fill(SQL.description);
      await modal.locator('[data-testid="stq-field-schema"]').fill(SQL.schema);
      await modal.locator('[data-testid="stq-field-seed"]').fill(SQL.seed);
      await modal.locator('[data-testid="stq-field-solution"]').fill(SQL.solution);
      // Превью эталона считает тот же раннер — таблица с cnt=2 значит, что схема и
      // запрос верные ещё до сохранения.
      await expect(modal.locator('.stq-preview .stq-table')).toContainText('cnt', { timeout: 15_000 });
      await expect(modal.locator('.stq-preview .stq-table td').first()).toHaveText('2');

      const task = await submitCreate(page, '/vs-task');
      flow.vsTaskId = task._id;
      expect(task.info.type).toBe('sql');

      const built = await waitSqlSync(api, task._id, { timeoutMs: SQL_SYNC_TIMEOUT });
      expect(built.info.sql_quick.solution).toBe(SQL.solution);

      await page.goto(`${ADMIN_URL}/vs-task/${task._id}`);
      await expect(page.locator('[data-testid="stq-sync-status"]')).toHaveAttribute('data-tone', 'ok');
    });

    test('2. VS-группа: SQL-задача строкой info_arr', async () => {
      await page.goto(`${ADMIN_URL}/vs-task-group`);
      await page.locator('[data-testid="table-add-button"]').click();
      await page.locator('[data-testid="table-modal"] [data-testid="vsg-name"] input').fill(flow.name('группа SQL'));
      const group = await submitCreate(page, '/vs-task-group');
      flow.vsTaskGroupId = group._id;

      await page.goto(`${ADMIN_URL}/vs-task-group/${group._id}`);
      await page.locator('[data-testid="vsg-status"] select').selectOption('active');
      await page.locator('[data-testid="vsg-desc"] textarea.w-md-editor-text-input').fill(SQL.description);
      // Special Type пустой — обычная группа с задачей на язык, не letcode. Пустой
      // пункт libs/Select рендерит с value "0", поэтому смотрим на выбранный индекс.
      await expect(page.locator('[data-testid="vsg-special-type"] select')).toHaveJSProperty('selectedIndex', 0);

      const infoArr = page.locator('[data-testid="vsg-info-arr"]');
      await infoArr.locator('.btn-push-add').click();
      const row = infoArr.locator('.arr-item').first();
      await row.locator('[data-testid="vsg-row-name"] input').fill(flow.name('sql'));
      await row.locator('[data-testid="vsg-row-status"] select').selectOption('active');
      await row.locator('[data-testid="vsg-row-lng"] select').selectOption('sql');

      // «Выбрать задачу» (#3987): выбор строки сам сохраняет группу.
      await row.locator('[data-testid="custom-pull-open"] button').click();
      const pull = page.locator('[data-testid="custom-pull"]');
      await pull.locator('[data-testid="custom-pull-search"]').fill(String(flow.vsTaskId));
      const picked = waitPut(page, '/vs-task-group', (b) => ((b.item || b).info_arr || []).some((r) => r.task_id == flow.vsTaskId));
      await pull.locator(`[data-testid="custom-pull-item"][data-item-id="${flow.vsTaskId}"]`).click();
      await picked;
      await expect(row.locator('[data-testid="vsg-row-task-link"]')).toHaveAttribute('data-task-id', String(flow.vsTaskId));

      const saved = waitPut(page, '/vs-task-group');
      await page.locator('[data-testid="defone-save-bottom"] button').click();
      await saved;

      const fresh = await api.one('/vs-task-group', group._id);
      expect(fresh.status).toBe('active');
      expect(fresh.lng_obj.ru.desc).toBe(SQL.description);
      expect((fresh.info || {}).special_type || '').toBe('');
      expect(fresh.info_arr).toHaveLength(1);
      expect(fresh.info_arr[0]).toMatchObject({ task_id: flow.vsTaskId, lng: 'sql', status: 'active' });
    });

    test('3. Вопрос-задача: квиз и привязка VS-группы', async () => {
      await page.goto(`${ADMIN_URL}/theme-question`);
      await page.locator('[data-testid="table-add-button"]').click();
      const modal = page.locator('[data-testid="table-modal"]');
      await modal.locator('[data-testid="question-create-type-task"]').click();
      await modal.locator('[data-testid="question-create-name"] textarea.w-md-editor-text-input').fill(flow.name('вопрос: посчитать пользователей старше 30'));
      const question = await submitCreate(page, '/theme-question');
      flow.questionId = question._id;
      expect(question.type).toBe('task');

      // Квиз: без валидного квиза у вопроса VS-задача в тренировку не попадает
      // (api ctrls/course.js, /api/load-quizes-by-module).
      await page.goto(`${ADMIN_URL}/theme-question/${question._id}`);
      await page.locator('#aq-sec-description [data-testid="quiz-configurator-open"]').click();
      const [quizRes] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/quiz'),
        page.locator('#quiz-add-top').click(),
      ]);
      const quiz = (await quizRes.json()).data;
      flow.quizId = quiz._id;
      await page.locator(`[data-testid="quiz-link"][data-quiz-id="${quiz._id}"]`).click();
      await page.waitForURL(`**/quizes/${quiz._id}`);

      // Страница квиза сохраняется сама (autoSave), кнопки не нужны.
      await page.locator('[data-testid="quiz-answer-type-quiz"]').click();
      await page.locator('[data-testid="quiz-status-active"]').click();
      await page.locator('[data-testid="quiz-name"] textarea.w-md-editor-text-input').fill('Сколько пользователей старше 30 в seed?');
      // Валидный квиз — минимум 3 варианта и ровно один верный (api dbsInit/quizDbs.js).
      const variants = [['2', true], ['3', false], ['4', false]];
      const list = page.locator('[data-testid="quiz-variations"]');
      for (const [ind, [text, isCorrect]] of variants.entries()) {
        await list.locator('.btn-push-add').last().click();
        const v = list.locator('.arr-item').nth(ind);
        await v.locator('[data-testid="quiz-variation-name"] textarea').fill(text);
        if (isCorrect) {
          await v.locator('[data-testid="quiz-variation-correct"] input[type="checkbox"]').click();
        }
      }
      await expect.poll(async () => {
        const q = await api.one('/quiz', quiz._id);
        return { isValid: q.isValid, question: q.question, correct: (q.variations || []).filter((it) => it.isCorrect).length };
      }, { timeout: 15_000, message: 'квиз сохранился валидным' }).toEqual({ isValid: true, question: question._id, correct: 1 });

      // API сам заводит вопросу аудио-квиз (ThemeQuestion.postSave, specialType
      // 'general'). Выключаем его на странице квиза: в тренировке модуля остаётся
      // ровно наш квиз, и состав не зависит от shuffle при moduleQuizSize = 1.
      const auto = ((await api.get('/quiz', { filter: { question: question._id }, per_page: 100 })).items || [])
        .filter((it) => it._id !== quiz._id);
      flow.disabledQuizIds = [];
      for (const it of auto) {
        await page.goto(`${ADMIN_URL}/quizes/${it._id}`);
        await page.locator('[data-testid="quiz-status-unactive"]').click();
        await expect.poll(async () => (await api.one('/quiz', it._id)).status, { timeout: 10_000 }).toBe('unactive');
        flow.disabledQuizIds.push(it._id);
      }

      // VS configurator → Add Assigning группы → флаг «Все».
      await page.goto(`${ADMIN_URL}/theme-question/${question._id}`);
      await page.locator('.aq__head [data-testid="vs-configurator-open"] button').click();
      const conf = page.locator('[data-testid="vs-configurator"]');
      await conf.locator('[data-testid="vs-configurator-search"]').fill(flow.name('группа SQL'));
      await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === '/api/assign-vs-task-to-question'),
        conf.locator(`#vs-configurator-add-${flow.vsTaskGroupId}`).first().click(),
      ]);
      await expect(conf.locator(`#vs-configurator-remove-${flow.vsTaskGroupId}`).first()).toBeVisible();
      // Без question_keys кнопка «Все» уже горит (умолчание {all: true}), но не
      // записана. Выключаем и включаем — в группе остаётся явный {all: true}.
      const all = conf.locator(`#vs-flag-${flow.vsTaskGroupId}-all`).first();
      await expect(all).toHaveClass(/btn-primary/);
      for (const expectAll of [false, true]) {
        const put = waitPut(page, '/vs-task-group', (b) => ((b.item || {}).question_keys || {})[question._id]?.all === expectAll);
        await all.click();
        await put;
      }
      await expect(all).toHaveClass(/btn-primary/);

      const group = await api.one('/vs-task-group', flow.vsTaskGroupId);
      expect(group.questions_plain).toContain(String(question._id));
      expect(group.question_keys[question._id]).toEqual({ all: true });
    });

    test('4. Модуль с вопросом', async () => {
      await page.goto(`${ADMIN_URL}/course-module`);
      await page.locator('[data-testid="table-add-button"]').click();
      await page.locator('[data-testid="table-modal"] [data-testid="module-name"] input').fill(flow.name('модуль'));
      const mod = await submitCreate(page, '/course-module');
      flow.courseModuleId = mod._id;

      await page.goto(`${ADMIN_URL}/course-module/${mod._id}`);
      // «Config Questions with Order»: левая панель «Доступные», поле ID переносит
      // найденный вопрос в правую «В модуле» и сразу сохраняет модуль.
      const moved = waitPut(page, '/course-module', (b) => ((b.item || b).questions || []).map(Number).includes(flow.questionId));
      const byId = page.locator('[data-testid="sprint-panel-available"] [data-testid="sprint-by-id-input"]');
      await byId.fill(String(flow.questionId));
      await byId.press('Enter');
      await moved;
      await expect(page.locator(`[data-testid="sprint-panel-module"] [data-testid="sprint-question-row"][data-question-id="${flow.questionId}"]`)).toBeVisible();

      await page.locator('[data-testid="module-quiz-exam-size"] input').fill('1');
      await page.locator('[data-testid="module-quiz-size"] input').fill('1');
      const saved = waitPut(page, '/course-module', (b) => String((b.item || b).moduleQuizSize) === '1');
      await page.locator('[data-testid="defone-save-bottom"] button').click();
      await saved;

      const fresh = await api.one('/course-module', mod._id);
      expect(fresh.questions.map(Number)).toEqual([flow.questionId]);
      expect(Number(fresh.quizExamSize)).toBe(1);
      expect(Number(fresh.moduleQuizSize)).toBe(1);
    });

    test('5. Курс с модулем, статус «Актив»', async () => {
      await page.goto(`${ADMIN_URL}/course`);
      await page.locator('[data-testid="table-add-button"]').click();
      await page.locator('[data-testid="table-modal"] [data-testid="course-name"] input').fill(flow.name('курс'));
      const course = await submitCreate(page, '/course');
      flow.courseId = course._id;

      await page.goto(`${ADMIN_URL}/course/${course._id}`);
      await page.locator('[data-testid="course-status-active"]').click();
      await page.locator('[data-testid="course-modules"] .btn-push-add').click();
      await page.locator('[data-testid="course-module-name"] input').fill(flow.name('модуль'));
      await page.locator('[data-testid="course-module-id"] input').fill(String(flow.courseModuleId));
      const saved = waitPut(page, '/course', (b) => ((b.item || b).modules || []).some((it) => it.module == flow.courseModuleId));
      await page.locator('[data-testid="defone-save-bottom"] button').click();
      await saved;

      const fresh = await api.one('/course', course._id);
      // Кандидату курс показывают по CourseUser(status 'active'); статус курса — 'active'
      // из CourseStatuses, чтобы курс был в активных и в админке.
      expect(fresh.status).toBe('active');
      expect(fresh.modules.map((it) => Number(it.module))).toEqual([flow.courseModuleId]);
    });

    test('6. Запись кандидата на курс', async () => {
      // Штатный путь админки: «Статистика» пользователя → вкладка courses → «Добавить
      // курс» (POST /api/add-user-course: CourseUser status 'active' + пересборка
      // истории курса). inviteId курса нигде не читается — приглашений по ссылке нет.
      await page.goto(`${ADMIN_URL}/user-stats-new#user=${flow.candidate._id}&tab=courses`);
      await page.locator('[data-testid="user-course-add-open"]').click();
      const select = page.locator('[data-testid="user-course-add-select"]');
      await expect(select.locator(`option[value="${flow.courseId}"]`)).toHaveCount(1);
      await select.selectOption(String(flow.courseId));
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/add-user-course'),
        page.locator('[data-testid="user-course-add-submit"]').click(),
      ]);
      await expect(page.locator(`[data-testid="user-course-row"][data-course-id="${flow.courseId}"]`)).toBeVisible();

      const links = (await api.get('/course-user', { filter: { user: flow.candidate._id, course: flow.courseId } })).items || [];
      expect(links).toHaveLength(1);
      expect(links[0].status).toBe('active');
      expect(links[0].questions.map(Number)).toContain(flow.questionId);
      flow.courseUserId = links[0]._id;

      // Итог подготовки: тренировка модуля отдаёт и квиз вопроса, и VS-задачу группы.
      // VS-задачи идут в pubQuizes после квизов, ключом opts.quiz = vs_<id группы>.
      const training = await api.get('/load-quizes-by-module', { _id: flow.courseModuleId });
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId]);
      const vs = (training.pubQuizes || []).filter((it) => (it.opts || {}).quiz === `vs_${flow.vsTaskGroupId}`);
      expect(vs).toHaveLength(1);
      expect(vs[0].item.info_arr[0]).toMatchObject({ task_id: flow.vsTaskId, lng: 'sql' });
      const { name, ...ids } = flow;
      console.log('sql-course-flow ids:', JSON.stringify(ids));
    });
  });
});
