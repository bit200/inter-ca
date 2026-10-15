// Сквозной поток платформы без докеров и VS Code: SQL-задача в браузерном формате
// (вопрос type 'js-task' + JsDetails codeType 'sql', проверка — services/sqlRunner.js
// API на общем Postgres) → квиз → модуль → курс → кандидат.
// Часть 1 («admin setup») — подготовка через UI админки itk-platform (E2E_ADMIN_URL)
// под обычным admin (не super_admin: VS Code для admin закрыт флагом, поток его не
// трогает). Часть 2 («candidate») — кандидат проходит курс в клиенте (E2E_BASE_URL):
// курс → глава → «Проверить знания» (квиз и SQL-задача в CodeRun: неверный запрос,
// DELETE, верный) → итоговая проверка модуля → повторный вход.
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
const { USERS, HIDDEN_USERS, seedSql, countOlder, namesOlder, buildQuiz } = require('../helpers/sqlCourseQuiz');
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
// Сдача запроса кандидатом (/run-question с isSubmit): те же две временные БД.
const RUN_TIMEOUT = 20_000;

const SQL = {
  schema: 'CREATE TABLE users (\n  id   int PRIMARY KEY,\n  name text NOT NULL,\n  age  int NOT NULL\n);',
  seed: seedSql(USERS),
  seedHidden: seedSql(HIDDEN_USERS),
  // «Имена пользователей старше 30, по имени»: ORDER BY делает порядок строк частью ответа.
  solution: 'SELECT name FROM users WHERE age > 30 ORDER BY name',
  // Негатив: «30 и старше» вместо «строго старше» — лишняя строка (Петр, 30).
  wrong: 'SELECT name FROM users WHERE age >= 30 ORDER BY name',
  // Изменение данных: раннер отвечает текстом checkSqlSafety, до Postgres запрос не доходит.
  destructive: 'DELETE FROM users WHERE age > 30',
  forbiddenMessage: 'Разрешены только запросы на чтение: SELECT или WITH',
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
    const moduleItem = () => cPage.locator(`[data-testid="course-module"][data-module-id="${flow.courseModuleId}"]`);
    const topic = () => cPage.locator(`[data-testid="course-topic"][data-question-id="${flow.questionId}"]`);
    const moduleCheck = () => cPage.locator('[data-testid="course-module-check"]');
    const trainItem = () => cPage.locator('[data-testid="train-item"]');
    const jsTask = () => cPage.locator(`[data-testid="js-task"][data-task-id="${flow.questionId}"]`);
    const jsResult = () => jsTask().locator('[data-testid="js-task-result"]');
    // «Результат сдачи» на вкладке «Результаты» CodeRun (после «Сдать» она открывается сама).
    const submitResults = () => jsTask().locator('[data-testid="code-run-results"][data-kind="submit"] [data-testid="sql-run-results"]');
    // «Результат запуска» — «Запустить» гоняет только открытые данные.
    const runResults = () => jsTask().locator('[data-testid="code-run-results"][data-kind="run"] [data-testid="sql-run-results"]');

    async function openCourse() {
      await cPage.goto('/courses');
      await expect(courseRow()).toContainText(flow.name('курс'));
      const details = waitApi(cPage, 'GET', '/get-my-course-details', (u) => u.searchParams.get('_id') == flow.courseId);
      // В строке две ссылки на курс: название и «Продолжить» — жмём название.
      await courseRow().getByRole('link', { name: flow.name('курс') }).click();
      await details;
      // Клиент сам дописывает ?topic=<глава> (последняя открытая) — сверяем только путь.
      await cPage.waitForURL((u) => u.pathname === `/courses/${flow.courseId}`);
    }

    // Ответ на квиз тренажёра: вариант с точным текстом (порядок вариантов перемешан).
    async function answerQuiz(text) {
      const saved = waitApi(cPage, 'POST', '/save-quiz-history');
      await cPage.locator('[data-testid="quiz-answer"]').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) }).click();
      await saved;
    }

    // Запрос в Monaco CodeRun и «Сдать» (или «Запустить» — submit: false). Monaco клиент
    // грузит с CDN, как и админка. Ввод — фокус в редактор и insertText (как вставка из
    // буфера, без автодополнения и автоскобок): значение идёт в CodeRun штатным onChange
    // редактора, как при вводе руками; window.monaco не берём — он есть, только пока
    // @monaco-editor/react грузит редактор с CDN. Возвращает ответ /run-question; тело
    // запроса сверяется: ушёл именно этот текст, с модулем курса (по нему сервер
    // проверяет доступ кандидата) и признаком сдачи.
    async function submitQuery(sql, { submit = true } = {}) {
      const editor = jsTask().locator('.crRight .monaco-editor');
      await expect(editor, 'Monaco CodeRun не загрузился: клиент берёт его с cdn.jsdelivr.net — проверьте сеть стенда')
        .toBeVisible({ timeout: EDITOR_TIMEOUT });
      await editor.locator('.view-lines').click();
      await cPage.keyboard.press('ControlOrMeta+A');
      await cPage.keyboard.press('Delete');
      await cPage.keyboard.insertText(sql);
      const [res] = await Promise.all([
        cPage.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/run-question',
          { timeout: RUN_TIMEOUT }),
        jsTask().locator(`[data-testid="${submit ? 'code-run-submit' : 'code-run-run'}"]`).click(),
      ]);
      const sent = res.request().postDataJSON();
      expect(sent).toMatchObject({ question: flow.questionId, courseModule: flow.courseModuleId, files: { '': sql } });
      expect(!!sent.isSubmit).toBe(submit);
      expect(res.ok(), `POST /api/run-question: HTTP ${res.status()}`).toBeTruthy();
      const body = await res.json();
      // Раннер лёг посреди прогона — причина сразу, а не расхождение таблиц.
      expect((body.sqlResults || []).filter((it) => it.reason === 'runner_error'), 'SQL-раннер API недоступен').toEqual([]);
      await expect(submit ? submitResults() : runResults()).toBeVisible();
      return body;
    }

    // Снимок SQL-задачи — в test-results/<тест>/ и во вложения html-отчёта, и при зелёном прогоне.
    async function shot(testInfo, name) {
      const file = testInfo.outputPath(`${name}.png`);
      await jsTask().screenshot({ path: file, animations: 'disabled' });
      await testInfo.attach(name, { path: file, contentType: 'image/png' });
    }

    // Квиз, затем SQL-задача — состав одинаков в проверке главы и в итоговой модуля:
    // js-задача лежит в quizes (знаменатель сдачи), в pubQuizes — после квиза.
    // VS Code закрыт флагом (#4038/#4039): VS-задач (vs_<группа>, answerType vs_task)
    // кандидат не получает. В данных потока VS-групп нет — проверяем, что их нет и в ответе.
    function expectTraining(training) {
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId, flow.questionId]);
      expect((training.pubQuizes || []).map((it) => it.opts.quiz)).toEqual([flow.quizId, `js_${flow.questionId}`]);
      const vs = (training.pubQuizes || []).filter((it) => /^vs_/.test(String(it.opts.quiz)) || (it.item || {}).answerType === 'vs_task');
      expect(vs, 'VS-задачи в /load-quizes-by-module кандидата').toEqual([]);
    }

    test.beforeAll(async ({ browser }) => {
      cPage = await (await browser.newContext({ baseURL: BASE_URL })).newPage();
    });

    test('7. Кандидат видит тестовый курс и открывает главу', async () => {
      await login(cPage, candidateCreds());
      await openCourse();
      await expect(moduleItem()).toContainText(flow.name('модуль'));
      await expect(moduleItem()).toHaveAttribute('data-done', 'false');

      // Первая глава модуля открыта сразу, итоговая проверка — под замком, пока глава не сдана.
      await topic().click();
      const chapter = cPage.locator(`[data-testid="course-chapter"][data-question-id="${flow.questionId}"]`);
      await expect(chapter).toContainText('имена пользователей старше 30');
      await expect(topic()).toHaveAttribute('data-done', 'false');
      await expect(moduleCheck()).toHaveAttribute('data-open', 'false');
    });

    test('8. «Проверить знания» главы: квиз и SQL-задача — неверный запрос, DELETE, верный', async ({}, testInfo) => {
      test.setTimeout(EDITOR_TIMEOUT + 5 * RUN_TIMEOUT + 30_000);
      const loaded = waitApi(cPage, 'GET', '/load-quizes-by-module', (u) => u.searchParams.get('question') == flow.questionId);
      await cPage.locator(`#course-quiz-open-question-${flow.questionId}`).click();
      expectTraining(await (await loaded).json());

      await expect(trainItem()).toHaveAttribute('data-quiz-key', String(flow.quizId));
      await answerQuiz(String(countOlder()));

      // Верный ответ сам уводит к следующему заданию — SQL-задаче в CodeRun.
      await expect(trainItem()).toHaveAttribute('data-quiz-key', `js_${flow.questionId}`);
      await expect(trainItem()).toHaveAttribute('data-answer-type', 'js_task');
      await expect(jsTask()).toHaveClass(/vs-task-sql/);
      await expect(cPage.locator('[data-testid="vs-task"]')).toHaveCount(0);
      // Под редактором — схема БД из задачи (SqlSchemaPanel), а не тест-кейсы.
      await expect(jsTask().locator('.sqlSchemaPanel')).toContainText('CREATE TABLE users');
      await expect(jsResult()).toHaveCount(0);

      // «Запустить» неверный запрос (>= 30) — открытые данные: таблицы «ваш» и «ожидаемый»
      // результат рядом, у вашей лишняя строка (Петр, 30). Зачёта «Запустить» не даёт.
      const wrongNames = USERS.filter((u) => u.age >= 30).map((u) => u.name).sort();
      const run = await submitQuery(SQL.wrong, { submit: false });
      expect({ total: run.totalCount, wrong: run.wrongCount }).toEqual({ total: 1, wrong: 1 });
      const runCase = runResults().locator('[data-testid="sql-case"]');
      await expect(runCase).toHaveAttribute('data-reason', 'rows_mismatch');
      await expect(runCase).toContainText(`Строк: ожидалось ${namesOlder(USERS).length}, получено ${wrongNames.length}`);
      for (const [kind, names] of [['actual', wrongNames], ['expected', namesOlder(USERS)]]) {
        const table = runCase.locator(`[data-testid="sql-result-table"][data-kind="${kind}"]`);
        await expect(table).toHaveAttribute('data-rows', String(names.length));
        await expect(table.locator('thead th')).toHaveText(['name']);
        await expect(table.locator('tbody td')).toHaveText(names);
      }
      await expect(jsResult()).toHaveCount(0);
      await shot(testInfo, 'sql-run-mismatch');

      // Неверный запрос (>= 30): не засчитан, видно расхождение — ваша выборка с лишней
      // строкой рядом с ожидаемой; скрытые данные — только «не прошло», без таблиц.
      const bad = await submitQuery(SQL.wrong);
      expect({ total: bad.totalCount, wrong: bad.wrongCount }).toEqual({ total: 2, wrong: 2 });
      await expect(jsResult()).toHaveAttribute('data-ok', 'false');
      await expect(jsResult()).toContainText('0 / 2');
      await expect(submitResults()).toHaveAttribute('data-passed', '0');
      const pubCase = submitResults().locator('[data-testid="sql-case"][data-hidden="false"]');
      await expect(pubCase).toHaveAttribute('data-ok', 'false');
      await expect(pubCase).toHaveAttribute('data-reason', 'rows_mismatch');
      const actual = pubCase.locator('[data-testid="sql-result-table"][data-kind="actual"]');
      const expected = pubCase.locator('[data-testid="sql-result-table"][data-kind="expected"]');
      await expect(actual.locator('tbody td')).toHaveText(USERS.filter((u) => u.age >= 30).map((u) => u.name).sort());
      await expect(expected.locator('tbody td')).toHaveText(namesOlder(USERS));
      const hiddenCase = submitResults().locator('[data-testid="sql-case"][data-hidden="true"]');
      await expect(hiddenCase).toHaveAttribute('data-ok', 'false');
      await expect(hiddenCase.locator('[data-testid="sql-result-table"]')).toHaveCount(0);

      // DELETE: раннер не пускает изменение данных — текст checkSqlSafety, не засчитано.
      const del = await submitQuery(SQL.destructive);
      expect(del.wrongCount).toBe(del.totalCount);
      expect(del.sqlResults.map((it) => it.reason)).toEqual(['forbidden', 'forbidden']);
      await expect(jsResult()).toHaveAttribute('data-ok', 'false');
      const delCase = submitResults().locator('[data-testid="sql-case"][data-hidden="false"]');
      await expect(delCase).toHaveAttribute('data-reason', 'forbidden');
      await expect(delCase).toContainText(SQL.forbiddenMessage);
      await shot(testInfo, 'sql-forbidden');

      // Верный запрос: проходит и на скрытых данных — засчитан, «Далее» становится основной.
      const ok = await submitQuery(SQL.solution);
      expect({ total: ok.totalCount, wrong: ok.wrongCount }).toEqual({ total: 2, wrong: 0 });
      await expect(jsResult()).toHaveAttribute('data-ok', 'true');
      await expect(submitResults()).toHaveAttribute('data-passed', '2');
      await expect(submitResults().locator('[data-testid="sql-case"][data-ok="true"]')).toHaveCount(2);
      await expect(jsTask().locator('[data-testid="js-task-next"]')).toHaveClass(/btn-primary/);
      await shot(testInfo, 'sql-passed');

      // «Далее» на последнем задании заканчивает проверку: квиз и задача — 2 из 2.
      const saved = waitApi(cPage, 'POST', '/save-course-module-question-results');
      await jsTask().locator('[data-testid="js-task-next"]').click();
      const body = (await saved).request().postDataJSON();
      expect(body).toMatchObject({ question: flow.questionId, quizPerc: 100, total: 2, status: 'ok', courseUserId: flow.courseUserId });
      await expect(cPage.locator('[data-testid="course-quiz-result"]')).toHaveAttribute('data-perc', '100');
      await cPage.locator('#course-quiz-finish').click();

      await expect(topic()).toHaveAttribute('data-done', 'true');
      await expect(moduleCheck()).toHaveAttribute('data-open', 'true');
      await expect.poll(async () => ((await api.one('/course-user', flow.courseUserId)).qHistory || {})[flow.questionId], {
        timeout: 10_000, message: 'CourseUser.qHistory главы',
      }).toEqual({ status: 'ok' });
    });

    test('9. Итоговая проверка модуля пройдена — модуль засчитан', async () => {
      test.setTimeout(EDITOR_TIMEOUT + RUN_TIMEOUT + 30_000);
      const loaded = waitApi(cPage, 'GET', '/load-quizes-by-module',
        (u) => u.searchParams.get('question') === '0' && u.searchParams.get('_id') == flow.courseModuleId);
      await cPage.locator(`#course-quiz-open-module-${flow.courseModuleId}`).click();
      expectTraining(await (await loaded).json());

      await answerQuiz(String(countOlder()));
      await expect(trainItem()).toHaveAttribute('data-quiz-key', `js_${flow.questionId}`);
      // Итоговая проверка — новая попытка: задачу сдают заново.
      await expect(jsResult()).toHaveCount(0);
      const ok = await submitQuery(SQL.solution);
      expect(ok.wrongCount).toBe(0);
      await expect(jsResult()).toHaveAttribute('data-ok', 'true');

      const saved = waitApi(cPage, 'POST', '/save-course-module-results');
      await jsTask().locator('[data-testid="js-task-next"]').click();
      const body = (await saved).request().postDataJSON();
      expect(body).toMatchObject({ courseModule: flow.courseModuleId, quizPerc: 100, total: 2, status: 'ok' });
      await expect(cPage.locator('[data-testid="course-quiz-result"]')).toHaveAttribute('data-ok', 'true');
      await cPage.locator('#course-quiz-finish').click();
      await expect(moduleItem()).toHaveAttribute('data-done', 'true');

      await expect.poll(async () => {
        const hist = (await api.get('/course-module-user-history', { filter: { user: flow.candidate._id, courseModule: flow.courseModuleId } })).items || [];
        return hist.map((it) => it.status);
      }, { timeout: 10_000, message: 'CourseModuleUserHistory модуля' }).toEqual(['ok']);
      await expect.poll(async () => ((await api.one('/course-user', flow.courseUserId)).mHistory || {})[flow.courseModuleId], {
        timeout: 10_000, message: 'CourseUser.mHistory модуля',
      }).toEqual({ status: 'ok' });
      // Сданная задача отмечена и в истории вопроса (/run-question при isSubmit без ошибок).
      const qHist = (await api.get('/question-user-history', { filter: { user: flow.candidate._id, question: flow.questionId } })).items || [];
      expect(qHist.map((it) => it.quizStatus)).toEqual(['ok']);
    });

    test('10. Повторный вход — прогресс курса сохранился', async () => {
      await cPage.context().clearCookies();
      await cPage.evaluate(() => localStorage.clear());
      await login(cPage, candidateCreds());
      await cPage.goto('/courses');
      // Процент изучения: модуль и его глава, оба сданы.
      await expect(courseRow()).toHaveAttribute('data-perc', '100');
      await openCourse();
      await expect(moduleItem()).toHaveAttribute('data-done', 'true');
      await expect(topic()).toHaveAttribute('data-done', 'true');
      await expect(moduleCheck()).toHaveAttribute('data-open', 'true');
      const { name, ...ids } = flow;
      console.log('sql-course-flow ids:', JSON.stringify(ids));
    });
  });
});
