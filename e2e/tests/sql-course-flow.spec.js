// Сквозной поток платформы без докеров и VS Code: SQL-задача в браузерном формате
// (вопрос type 'js-task' + JsDetails codeType 'sql', проверка — services/sqlRunner.js
// API на общем Postgres) → квиз → модуль → курс → кандидат.
// Часть 1 («admin setup») — подготовка через UI админки itk-platform (E2E_ADMIN_URL)
// под обычным admin (не super_admin: VS Code для admin закрыт флагом, поток его не
// трогает). Часть 2 («candidate») — кандидат проходит курс в клиенте inter-ca
// (E2E_BASE_URL): глава, «Проверить знания» с квизом и SQL-задачей js_<id> (#4040),
// неверный, запрещённый и верный запрос, итоговая проверка модуля (сначала с
// несданной SQL-задачей, затем пересдача), повторный вход.
//
// describe.serial гарантирует порядок; созданные _id лежат в общем объекте `flow` —
// из него их читает часть 2 — и дублируются в test-results/sql-course-flow.json для
// разбора прогона. Сервисы, env и тестовые пользователи — e2e/README.md, раздел
// «Сквозной поток sql-course-flow». VS Code-вариант потока — sql-vs-course-flow.spec.js.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ADMIN_URL, BASE_URL, adminCreds, candidateCreds } = require('../helpers/env');
const { login, loginAdmin } = require('../helpers/auth');
const { e2eName } = require('../helpers/e2eNames');
const {
  USERS, HIDDEN_USERS, seedSql, countOlder, namesOlder, buildQuiz, courseCheckResult,
} = require('../helpers/sqlCourseQuiz');
const {
  createAdminApi, createUserApi, loginUser, assertSqlRunnerReady, cleanupStaleE2e, purgeE2eRun,
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
// /run-question кандидата: временная БД на кейс, при сдаче — два кейса.
const RUN_TIMEOUT = 20_000;

const SQL = {
  schema: 'CREATE TABLE users (\n  id   int PRIMARY KEY,\n  name text NOT NULL,\n  age  int NOT NULL\n);',
  seed: seedSql(USERS),
  seedHidden: seedSql(HIDDEN_USERS),
  // «Имена пользователей старше 30, по имени»: ORDER BY делает порядок строк частью ответа.
  solution: 'SELECT name FROM users WHERE age > 30 ORDER BY name',
  // Негатив: «30 и старше» вместо «строго старше» — лишняя строка (Петр, 30).
  wrong: 'SELECT name FROM users WHERE age >= 30 ORDER BY name',
  // Негатив кандидата: забыл условие age > 30 — все пользователи вместо двух.
  noFilter: 'SELECT name FROM users ORDER BY name',
  // Запрещённые checkSqlSafety: запись и второй запрос через «;».
  deleteRows: 'DELETE FROM users',
  twoQueries: 'SELECT name FROM users; DELETE FROM users',
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
  /** @type {import('@playwright/test').Page} — кандидат в клиенте inter-ca */
  let cPage;
  let candidateApi;

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
    await candidateApi?.dispose();
    await cPage?.context().close();
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

  test.describe('candidate', () => {
    const courseRow = () => cPage.locator(`[data-testid="course-list-item"][data-course-id="${flow.courseId}"]`);
    const topic = () => cPage.locator(`[data-testid="course-topic"][data-question-id="${flow.questionId}"]`);
    const moduleItem = () => cPage.locator(`[data-testid="course-module"][data-module-id="${flow.courseModuleId}"]`);
    const trainItem = () => cPage.locator('[data-testid="train-item"]');
    const jsTask = () => cPage.locator('[data-testid="js-task"]');
    const quizResult = () => cPage.locator('[data-testid="course-quiz-result"]');
    // Результаты CodeRun: «Запустить» (открытые данные) и «Сдать» (плюс скрытые).
    const runCases = () => jsTask().locator('[data-testid="code-run-results-run"] [data-testid="sql-case"]');
    const submitResults = () => jsTask().locator('[data-testid="code-run-results-submit"] [data-testid="sql-run-results"]');

    async function openCourse() {
      await cPage.goto('/courses');
      await expect(courseRow()).toContainText(flow.name('курс'));
      const details = waitApi(cPage, 'GET', '/get-my-course-details', (u) => u.searchParams.get('_id') == flow.courseId);
      // В строке две ссылки на курс: название и «Продолжить» — жмём название.
      await courseRow().getByRole('link', { name: flow.name('курс') }).click();
      await details;
      // Выбранная глава хранится в URL (?topic=<id>, #4031) — при повторном входе
      // курс открывается сразу на ней.
      await cPage.waitForURL((u) => u.pathname === `/courses/${flow.courseId}`);
    }

    // «Проверить знания»: главы (questionId) или итоговая модуля (question=0).
    async function openCheck(buttonId, isQuestion) {
      const loaded = waitApi(cPage, 'GET', '/load-quizes-by-module', (u) => u.searchParams.get('_id') == flow.courseModuleId
        && u.searchParams.get('question') === (isQuestion ? String(flow.questionId) : '0'));
      await cPage.locator(buttonId).click();
      const training = await (await loaded).json();
      // В проверке — квиз вопроса и сама SQL-задача, обе в знаменателе (quizes).
      // VS-задач нет: VS Code закрыт флагом (#4039), в части 1 VS-группа не привязана.
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId, flow.questionId]);
      expect(training.pubQuizes.map((it) => it.opts.quiz)).toEqual([flow.quizId, `js_${flow.questionId}`]);
      return training;
    }

    // Ответ на квиз тренажёра: вариант с точным текстом (порядок вариантов перемешан).
    // Верный ответ сам уводит к следующему заданию — SQL-задаче.
    async function answerQuizAndGoToSql() {
      await expect(trainItem()).toHaveAttribute('data-quiz-key', String(flow.quizId));
      const saved = waitApi(cPage, 'POST', '/save-quiz-history');
      await cPage.locator('[data-testid="quiz-answer"]').filter({ hasText: new RegExp(`^\\s*${countOlder()}\\s*$`) }).click();
      await saved;
      await expect(trainItem()).toHaveAttribute('data-quiz-key', `js_${flow.questionId}`);
      await expect(trainItem()).toHaveAttribute('data-answer-type', 'js_task');
      await expect(jsTask()).toHaveAttribute('data-task-id', String(flow.questionId));
    }

    // Ввод в Monaco штатно, как кандидат: клик в редактор, «выделить всё», затем
    // insertText — как вставка из буфера: без автодополнения и автоскобок, которые
    // при посимвольном type дописали бы лишнее. API Monaco клиент в window не отдаёт.
    async function typeSql(query) {
      const editor = jsTask().locator('[data-testid="code-run-editor"] .monaco-editor');
      await expect(editor, 'Monaco SQL-задачи не загрузился: @monaco-editor/react клиента берёт его '
        + 'с cdn.jsdelivr.net — проверьте сеть стенда').toBeVisible({ timeout: EDITOR_TIMEOUT });
      await editor.locator('.view-lines').click();
      await cPage.keyboard.press('ControlOrMeta+A');
      await cPage.keyboard.insertText(query);
      await expect(editor.locator('.view-lines')).toHaveText(query);
    }

    // «Запустить» / «Сдать» в CodeRun → /run-question; ответ сервера — для сверки с UI.
    async function runSql(kind) {
      const res = waitApi(cPage, 'POST', '/run-question');
      await jsTask().locator(`[data-testid="code-run-${kind}"]`).click();
      const r = await res;
      expect(r.ok(), `POST /api/run-question (${kind})`).toBeTruthy();
      expect(r.request().postDataJSON()).toMatchObject({ question: flow.questionId, courseModule: flow.courseModuleId });
      return r.json();
    }

    async function solveSql(query, { passed }) {
      await typeSql(query);
      const res = await runSql('submit');
      const total = 2; // открытые данные + скрытые
      expect(res.totalCount).toBe(total);
      expect(res.wrongCount === 0).toBe(passed);
      await expect(submitResults()).toHaveAttribute('data-total', String(total));
      await expect(submitResults()).toHaveAttribute('data-pass', String(res.passCount));
      await expect(submitResults().locator('[data-testid="sql-case"][data-hidden="true"]')).toHaveCount(1);
      const result = jsTask().locator('[data-testid="js-task-result"]');
      await expect(result).toHaveAttribute('data-ok', passed ? 'true' : 'false');
      return res;
    }

    async function moduleHistory() {
      const items = (await api.get('/course-module-user-history', {
        filter: { user: flow.candidate._id, courseModule: flow.courseModuleId },
      })).items || [];
      return items.map((it) => ({ status: it.status, quizPerc: it.quizPerc }));
    }

    test.beforeAll(async ({ browser }) => {
      candidateApi = await createUserApi(candidateCreds());
      cPage = await (await browser.newContext({ baseURL: BASE_URL })).newPage();
    });

    test('7. Кандидат видит тестовый курс и открывает его', async () => {
      await login(cPage, candidateCreds());
      await openCourse();
      await expect(moduleItem()).toContainText(flow.name('модуль'));
      await expect(moduleItem()).toHaveAttribute('data-done', 'false');
    });

    test('8. Глава с SQL-вопросом: материал', async () => {
      // Первая глава модуля открыта сразу (PreviewCourseModule), итоговая проверка
      // модуля — под замком, пока глава не сдана.
      await topic().click();
      const chapter = cPage.locator(`[data-testid="course-chapter"][data-question-id="${flow.questionId}"]`);
      await expect(chapter).toContainText('SQL: имена пользователей старше 30');
      await expect(topic()).toHaveAttribute('data-done', 'false');
      await expect(cPage.locator('[data-testid="course-module-check"]')).toHaveAttribute('data-open', 'false');
    });

    test('9. «Проверить знания» главы: квиз, затем SQL-задача со схемой', async () => {
      test.setTimeout(EDITOR_TIMEOUT + 30_000);
      await openCheck(`#course-quiz-open-question-${flow.questionId}`, true);
      await answerQuizAndGoToSql();

      // SQL-задача в CodeRun: схема БД (SqlSchemaPanel) вместо тест-кейсов, Monaco.
      await expect(jsTask()).toHaveClass(/vs-task-sql/);
      await expect(jsTask().locator('[data-testid="sql-schema"]')).toContainText('CREATE TABLE users');
      await expect(jsTask().locator('[data-testid="sql-schema"]')).toContainText('PostgreSQL');
      await expect(jsTask().locator('[data-testid="code-run-editor"] .monaco-editor')).toBeVisible({ timeout: EDITOR_TIMEOUT });
      // Флаг VS Code (#4039): кандидату не уходит ни VS-задач, ни их элементов.
      await expect(cPage.locator('[data-testid^="vs-task"]')).toHaveCount(0);
      await expect(jsTask().locator('iframe')).toHaveCount(0);
    });

    test('10. SQL-задача: неверный, запрещённый и верный запрос', async () => {
      test.setTimeout(EDITOR_TIMEOUT + 6 * RUN_TIMEOUT);

      // Без условия age > 30: «Запустить» показывает расхождение с эталоном таблицами.
      await typeSql(SQL.noFilter);
      const bad = await runSql('run');
      expect(bad.sqlResults).toHaveLength(1);
      expect(bad.sqlResults[0]).toMatchObject({ ok: false, reason: 'rows_mismatch' });
      const badCase = runCases().first();
      await expect(badCase).toHaveAttribute('data-ok', 'false');
      await expect(badCase).toHaveAttribute('data-reason', 'rows_mismatch');
      await expect(badCase).toContainText(`Строк: ожидалось ${namesOlder().length}, получено ${USERS.length}`);
      // Ваш результат — все имена, ожидаемый — только старше 30.
      const tables = badCase.locator('table.sqlResultTable');
      await expect(tables.nth(0).locator('tbody td')).toHaveText(USERS.map((u) => u.name).sort());
      await expect(tables.nth(1).locator('tbody td')).toHaveText(namesOlder());

      // «Сдать» неверный запрос — задача не засчитана.
      await solveSql(SQL.noFilter, { passed: false });

      // Запрещённые запросы: понятная ошибка checkSqlSafety, страница живёт дальше.
      for (const [query, message] of [
        [SQL.deleteRows, 'Разрешены только запросы на чтение: SELECT или WITH'],
        [SQL.twoQueries, 'Разрешён только один запрос: уберите «;» в середине'],
      ]) {
        await typeSql(query);
        const res = await runSql('run');
        expect(res.sqlResults[0]).toMatchObject({ ok: false, reason: 'forbidden', message });
        await expect(runCases().first()).toHaveAttribute('data-reason', 'forbidden');
        await expect(runCases().first()).toContainText(message);
        await expect(jsTask().locator('[data-testid="js-task-result"]')).toHaveAttribute('data-ok', 'false');
      }

      // Верный запрос: «Запустить» — совпадает с эталоном на открытых данных,
      // «Сдать» — все кейсы (открытый и скрытый) прошли, задача засчитана.
      await typeSql(SQL.solution);
      const good = await runSql('run');
      expect(good).toMatchObject({ totalCount: 1, passCount: 1, wrongCount: 0 });
      await expect(runCases().first()).toHaveAttribute('data-ok', 'true');
      const passed = await solveSql(SQL.solution, { passed: true });
      expect(passed.sqlResults.map((it) => ({ ok: it.ok, hidden: it.hidden }))).toEqual([
        { ok: true, hidden: false }, { ok: true, hidden: true },
      ]);
      // Скрытые данные кандидату не уходят — только итог кейса.
      expect(passed.sqlResults[1].actual).toBeUndefined();
      expect(passed.sqlResults[1].expected).toBeUndefined();
      await expect(submitResults().locator('[data-testid="sql-case"][data-ok="true"]')).toHaveCount(2);
      await expect(jsTask().locator('[data-testid="js-task-next"]')).toHaveClass(/btn-primary/);
    });

    test('11. Глава засчитана: квиз и SQL-задача — 100%', async () => {
      const expected = courseCheckResult([true, true]);
      const qSaved = waitApi(cPage, 'POST', '/save-course-module-question-results');
      await jsTask().locator('[data-testid="js-task-next"]').click();
      const qBody = (await qSaved).request().postDataJSON();
      expect(qBody).toMatchObject({ question: flow.questionId, courseUserId: flow.courseUserId, ...expected });
      await expect(quizResult()).toHaveAttribute('data-perc', String(expected.quizPerc));
      await expect(quizResult()).toHaveAttribute('data-ok', 'true');
      await cPage.locator('#course-quiz-finish').click();

      await expect(topic()).toHaveAttribute('data-done', 'true');
      await expect(cPage.locator('[data-testid="course-module-check"]')).toHaveAttribute('data-open', 'true');
      await expect.poll(async () => ((await api.one('/course-user', flow.courseUserId)).qHistory || {})[flow.questionId], {
        timeout: 10_000, message: 'CourseUser.qHistory главы',
      }).toEqual({ status: 'ok' });
    });

    test('12. Итоговая проверка модуля: SQL не решена — модуль не засчитан (правило процента)', async () => {
      test.setTimeout(EDITOR_TIMEOUT + 3 * RUN_TIMEOUT);
      // Квиз верно, SQL-задача сдана неверно: 1 балл из 2 = 50% < 85% → 'error'.
      const expected = courseCheckResult([true, false]);
      expect(expected).toEqual({ quizPerc: 50, total: 2, status: 'error' });

      await openCheck(`#course-quiz-open-module-${flow.courseModuleId}`, false);
      await answerQuizAndGoToSql();
      await solveSql(SQL.wrong, { passed: false });

      const mSaved = waitApi(cPage, 'POST', '/save-course-module-results');
      await jsTask().locator('[data-testid="js-task-next"]').click();
      const mBody = (await mSaved).request().postDataJSON();
      expect(mBody).toMatchObject({ courseModule: flow.courseModuleId, courseUserId: flow.courseUserId, ...expected });
      await expect(quizResult()).toHaveAttribute('data-perc', String(expected.quizPerc));
      await expect(quizResult()).toHaveAttribute('data-ok', 'false');

      await expect.poll(moduleHistory, { timeout: 10_000, message: 'CourseModuleUserHistory модуля' })
        .toEqual([{ status: 'error', quizPerc: expected.quizPerc }]);
      expect(((await api.one('/course-user', flow.courseUserId)).mHistory || {})[flow.courseModuleId]).toBeUndefined();
    });

    test('13. Пересдача модуля: квиз и SQL верно — модуль засчитан', async () => {
      test.setTimeout(EDITOR_TIMEOUT + 3 * RUN_TIMEOUT);
      const expected = courseCheckResult([true, true]);
      // «Пройти заново» на экране результата: проверка грузится заново.
      const loaded = waitApi(cPage, 'GET', '/load-quizes-by-module', (u) => u.searchParams.get('question') === '0');
      await cPage.locator('#course-quiz-restart').click();
      await loaded;
      await answerQuizAndGoToSql();
      await solveSql(SQL.solution, { passed: true });

      const mSaved = waitApi(cPage, 'POST', '/save-course-module-results');
      await jsTask().locator('[data-testid="js-task-next"]').click();
      const mBody = (await mSaved).request().postDataJSON();
      expect(mBody).toMatchObject({ courseModule: flow.courseModuleId, courseUserId: flow.courseUserId, ...expected });
      await expect(quizResult()).toHaveAttribute('data-ok', 'true');
      await cPage.locator('#course-quiz-finish').click();
      await expect(moduleItem()).toHaveAttribute('data-done', 'true');

      await expect.poll(async () => (await moduleHistory())[0]?.status, {
        timeout: 10_000, message: 'CourseModuleUserHistory модуля',
      }).toBe('ok');
      await expect.poll(async () => ((await api.one('/course-user', flow.courseUserId)).mHistory || {})[flow.courseModuleId], {
        timeout: 10_000, message: 'CourseUser.mHistory модуля',
      }).toEqual({ status: 'ok' });
    });

    test('14. Выход и повторный вход — прогресс курса сохранился', async () => {
      await cPage.context().clearCookies();
      await cPage.evaluate(() => localStorage.clear());
      await login(cPage, candidateCreds());
      await cPage.goto('/courses');
      // Процент изучения: модуль и его глава, оба сданы.
      await expect(courseRow()).toHaveAttribute('data-perc', '100');
      await openCourse();
      await expect(moduleItem()).toHaveAttribute('data-done', 'true');
      await expect(topic()).toHaveAttribute('data-done', 'true');
      await expect(cPage.locator('[data-testid="course-module-check"]')).toHaveAttribute('data-open', 'true');
      // То же глазами API кандидата: курс отдаёт сданные главу и модуль.
      const { courseUser } = await candidateApi.get('/get-my-course-details', { _id: flow.courseId });
      expect((courseUser.qHistory || {})[flow.questionId]).toEqual({ status: 'ok' });
      expect((courseUser.mHistory || {})[flow.courseModuleId]).toEqual({ status: 'ok' });
      const { name, ...ids } = flow;
      console.log('sql-course-flow ids:', JSON.stringify(ids));
    });
  });
});
