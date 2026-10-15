// Сквозной поток платформы без докеров и VS Code: SQL-задача в браузерном формате
// (вопрос type 'js-task' + JsDetails codeType 'sql', проверка — services/sqlRunner.js
// API на общем Postgres) → квиз → модуль → курс → кандидат.
// Часть 1 («admin setup») — подготовка через UI админки itk-platform (E2E_ADMIN_URL)
// под обычным admin (не super_admin: VS Code для admin закрыт флагом, поток его не
// трогает). Часть 2 (кандидат проходит курс в клиенте) допишется в этот же файл
// отдельным describe после «admin setup».
//
// describe.serial гарантирует порядок; созданные _id лежат в общем объекте `flow` —
// из него их читает часть 2 — и дублируются в test-results/sql-course-flow.json для
// разбора прогона. Сервисы, env и тестовые пользователи — e2e/README.md, раздел
// «Сквозной поток sql-course-flow». VS Code-вариант потока — sql-vs-course-flow.spec.js.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ADMIN_URL, adminCreds, candidateCreds } = require('../helpers/env');
const { loginAdmin } = require('../helpers/auth');
const { e2eName } = require('../helpers/e2eNames');
const { USERS, HIDDEN_USERS, seedSql, namesOlder, buildQuiz } = require('../helpers/sqlCourseQuiz');
const {
  createAdminApi, loginUser, assertSqlRunnerReady, cleanupStaleE2e, purgeE2eRun,
} = require('../helpers/adminApi');
const {
  waitApi, createQuestion, addQuestionQuiz, createModuleWithQuestion, createActiveCourse, enrollCandidate,
} = require('../helpers/adminCourseSetup');

const PREFIX = 'e2e-sql';
// Старше этого — мусор прошлых прогонов, удаляем перед стартом.
const CLEANUP_HOURS = Number(process.env.E2E_CLEANUP_HOURS || 6);
// Monaco в админке грузится лениво с cdn.jsdelivr.net (@monaco-editor/react) — до ~10 с.
const EDITOR_TIMEOUT = 30_000;
// Эталон на двух наборах данных: две временные БД в Postgres раннера.
const REFERENCE_TIMEOUT = 20_000;

const SQL = {
  schema: 'CREATE TABLE users (\n  id   int PRIMARY KEY,\n  name text NOT NULL,\n  age  int NOT NULL\n);',
  seed: seedSql(USERS),
  seedHidden: seedSql(HIDDEN_USERS),
  // «Имена пользователей старше 30, по имени»: ORDER BY делает порядок строк частью ответа.
  solution: 'SELECT name FROM users WHERE age > 30 ORDER BY name',
  // Негатив: «30 и старше» вместо «строго старше» — лишняя строка (Петр, 30).
  wrong: 'SELECT name FROM users WHERE age >= 30 ORDER BY name',
};

const flow = { ts: Date.now() };
flow.name = (suffix) => e2eName(PREFIX, flow.ts, suffix);

function saveFlow(testInfo) {
  const file = path.join(testInfo.project.outputDir || 'test-results', 'sql-course-flow.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const { name, ...data } = flow;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
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
    // Всё, что завёл прогон, удаляем из базы — и при упавшем шаге: что успели
    // создать, то и лежит в flow.
    if (api) {
      await purgeE2eRun(api, {
        courses: [flow.courseId],
        modules: [flow.courseModuleId],
        questions: [flow.questionId],
      }, { candidateId: flow.candidate?._id, since: flow.ts, log: (m) => console.log(m) })
        .catch((e) => console.log(`purge e2e: ${e.message}`));
    }
    await page?.close();
    await api?.dispose();
  });

  test.afterEach(async ({}, testInfo) => saveFlow(testInfo));

  test.describe('admin setup', () => {
    test('1. SQL-раннер доступен', async () => {
      // Без раннера не посчитать эталон и не проверить решение — падаем сразу с
      // адресом Postgres и командой, как его поднять, а не по таймауту на шаге 2.
      const status = await assertSqlRunnerReady(api);
      flow.sqlRunner = status.target;
    });

    test('2. Вопрос js-task: SQL-задача в JsDetails, эталон проходит', async () => {
      test.setTimeout(EDITOR_TIMEOUT + REFERENCE_TIMEOUT + 60_000);
      const question = await createQuestion(page, { type: 'js-task', name: flow.name('SQL: имена пользователей старше 30') });
      flow.questionId = question._id;
      expect(question.type).toBe('js-task');

      // «Задача (запуск)» на странице вопроса: правки копятся в локальной версии,
      // в базу (JsDetails) их пишет «Выпустить».
      await page.goto(`${ADMIN_URL}/theme-question/${question._id}`);
      const codeType = page.locator('[data-testid="jsd-code-type"] select');
      await codeType.selectOption('sql');
      await expect(codeType).toHaveValue('sql');
      await page.locator('[data-testid="jsd-sql-schema"] textarea').fill(SQL.schema);
      await page.locator('[data-testid="jsd-sql-seed"] textarea').fill(SQL.seed);
      await page.locator('[data-testid="jsd-sql-seed-hidden"] textarea').fill(SQL.seedHidden);

      // Эталон — Monaco «Правильное решение». insertText — как вставка из буфера:
      // без автодополнения и автоскобок редактора.
      const editor = page.locator('[data-testid="jsd-solution-editor"] .monaco-editor');
      await expect(editor, 'Monaco «Правильное решение» не загрузился: @monaco-editor/react админки берёт его '
        + 'с cdn.jsdelivr.net — проверьте сеть стенда').toBeVisible({ timeout: EDITOR_TIMEOUT });
      await editor.locator('.view-lines').click();
      await page.keyboard.insertText(SQL.solution);
      await expect(editor.locator('.view-lines')).toContainText('ORDER BY name');

      // Ожидаемые результаты (/admin-get-responses): эталон на данных «Запустить» и на
      // данных сдачи со скрытыми — оба набора без ошибок и с нужными строками.
      const [refRes] = await Promise.all([
        waitApi(page, 'POST', '/admin-get-responses'),
        page.locator('[data-testid="jsd-sql-reference-run"]').click(),
      ]);
      expect(refRes.request().postDataJSON()).toMatchObject({
        codeType: 'sql', schemaSql: SQL.schema, seedSql: SQL.seed, seedHiddenSql: SQL.seedHidden, codeStr: SQL.solution,
      });
      const reference = page.locator('[data-testid="jsd-sql-reference"]');
      await expect(reference).toContainText('Порядок строк важен', { timeout: REFERENCE_TIMEOUT });
      const pub = reference.locator('[data-testid="jsd-sql-reference-case"][data-name="seed"]');
      const full = reference.locator('[data-testid="jsd-sql-reference-case"][data-name="seed + hidden"]');
      await expect(pub).toHaveAttribute('data-ok', 'true');
      await expect(pub).toHaveAttribute('data-rows', String(namesOlder(USERS).length));
      await expect(pub.locator('tbody td')).toHaveText(namesOlder(USERS));
      await expect(full).toHaveAttribute('data-ok', 'true');
      await expect(full.locator('tbody td')).toHaveText(namesOlder([...USERS, ...HIDDEN_USERS]));

      // «Выпустить» — версия становится текущей, JsDetails вопроса пишется в базу.
      const [released] = await Promise.all([
        waitApi(page, 'POST', '/create-lts'),
        page.locator('[data-testid="aq-release-patch"]').click(),
      ]);
      expect(released.ok(), 'POST /api/create-lts').toBeTruthy();

      const { details } = await api.get('/get-js-details', { question: question._id });
      expect(details).toMatchObject({
        codeType: 'sql', schemaSql: SQL.schema, seedSql: SQL.seed, seedHiddenSql: SQL.seedHidden, correctSolution: SQL.solution,
      });

      // Эталон проходит проверку так же, как решение кандидата: «Сдать» (isSubmit)
      // гоняет его и на скрытых данных. Неверный запрос не проходит уже на открытых.
      const ok = await api.post('/run-question', { question: question._id, files: { '': SQL.solution }, isSubmit: true });
      expect({ total: ok.totalCount, wrong: ok.wrongCount }).toEqual({ total: 2, wrong: 0 });
      const bad = await api.post('/run-question', { question: question._id, files: { '': SQL.wrong } });
      expect(bad.wrongCount).toBe(1);
      expect(bad.sqlResults[0].reason).toBe('rows_mismatch');
    });

    test('3. Квиз к вопросу: один верный вариант', async () => {
      await addQuestionQuiz(page, api, flow, buildQuiz());
    });

    test('4. Модуль с вопросом', async () => {
      await createModuleWithQuestion(page, api, flow);
    });

    test('5. Курс с модулем, статус «Актив»', async () => {
      await createActiveCourse(page, api, flow);
    });

    test('6. Запись кандидата на курс', async () => {
      await enrollCandidate(page, api, flow);

      // Итог подготовки: проверка знаний модуля отдаёт квиз вопроса и саму SQL-задачу
      // (#4040: элемент js_<id вопроса>, входит в знаменатель сдачи наравне с квизом).
      // Кандидату уходит только публичная часть JsDetails — без эталона и скрытых данных.
      const training = await api.get('/load-quizes-by-module', { _id: flow.courseModuleId });
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId, flow.questionId]);
      expect((training.pubQuizes || []).map((it) => it.opts.quiz)).toEqual([flow.quizId, `js_${flow.questionId}`]);
      const task = training.pubQuizes[1].item;
      expect(task.answerType).toBe('js_task');
      expect(task.jsDetails).toEqual({ codeType: 'sql', schemaSql: SQL.schema, seedSql: SQL.seed });
      const { name, ...ids } = flow;
      console.log('sql-course-flow ids:', JSON.stringify(ids));
    });
  });
});
