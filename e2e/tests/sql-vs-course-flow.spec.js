// Сквозной поток с VS Code: SQL-задача → группа → вопрос → модуль → курс → кандидат.
// Браузерный вариант без докеров — sql-course-flow.spec.js. Пока VS Code закрыт флагом
// (только super_admin, задачи #4038/#4039), этому потоку нужны креды super_admin в
// E2E_ADMIN_* и VS_CODE_ENABLED=true в API (или кандидат с ролью super_admin).
// Часть 1 — подготовка через UI админки itk-platform (E2E_ADMIN_URL). Часть 2 —
// прохождение курса кандидатом в клиенте (E2E_BASE_URL): курс, глава, проверка
// знаний с квизом и VS-задачей, решение SQL-задачи в VS Code-сессии, итоговая
// проверка модуля, повторный вход. describe.serial гарантирует порядок, а созданные
// _id лежат в общем объекте `flow` (и дублируются в test-results/sql-vs-course-flow.json
// для разбора прогона).
//
// Сервисы, env и как завести тестовых пользователей — e2e/README.md, раздел
// «Сквозной поток sql-vs-course-flow (VS Code)».
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ADMIN_URL, BASE_URL, adminCreds, candidateCreds } = require('../helpers/env');
const { login, loginAdmin } = require('../helpers/auth');
const { e2eName } = require('../helpers/e2eNames');
const { seedSql, buildQuiz, countOlder } = require('../helpers/sqlCourseQuiz');
const {
  createAdminApi, createUserApi, loginUser, assertSqlBuildReady, waitSqlSync, cleanupStaleE2e, purgeE2eRun,
} = require('../helpers/adminApi');
const { createDockerM, saveSessionResult } = require('../helpers/vsSession');
const {
  submitCreate, waitPut, waitApi, createQuestion, addQuestionQuiz, createModuleWithQuestion, createActiveCourse, enrollCandidate,
} = require('../helpers/adminCourseSetup');

const PREFIX = 'e2e-sql';
// Старше этого — мусор прошлых прогонов, удаляем перед стартом.
const CLEANUP_HOURS = Number(process.env.E2E_CLEANUP_HOURS || 6);
// Сборка файлов SQL-задачи: эталон в Postgres раннера + docker-m. Обычно 5–20 с.
const SQL_SYNC_TIMEOUT = 120_000;
// Старт VS Code-сессии (docker compose: редактор + Postgres сессии). Обычно 5–15 с.
const VS_START_TIMEOUT = 180_000;
// Прогон SQL-раннера сессии и запись результата в VsSession.
const VS_TESTS_TIMEOUT = 120_000;

const SQL = {
  description: 'Посчитайте пользователей старше 30 лет. Верните одну колонку `cnt`.',
  schema: 'CREATE TABLE users (\n  id   int PRIMARY KEY,\n  name text NOT NULL,\n  age  int NOT NULL\n);',
  seed: seedSql(),
  solution: 'SELECT COUNT(*) AS cnt FROM users WHERE age > 30;',
  // Негативный случай: «30 и старше» вместо «строго старше» — на seed на одного больше.
  wrong: 'SELECT COUNT(*) AS cnt FROM users WHERE age >= 30;',
  file: 'queries/01_query.sql',
};

const flow = { ts: Date.now() };
flow.name = (suffix) => e2eName(PREFIX, flow.ts, suffix);

function saveFlow(testInfo) {
  const file = path.join(testInfo.project.outputDir || 'test-results', 'sql-vs-course-flow.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const { name, ...data } = flow;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Ответ на квиз тренажёра: вариант с точным текстом (порядок вариантов перемешан).
async function answerQuiz(page, text) {
  const saved = waitApi(page, 'POST', '/save-quiz-history');
  await page.locator('[data-testid="quiz-answer"]').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) }).click();
  await saved;
}

// Ждём, пока VsSession получит новый результат тестов (last_cd сменился).
async function waitTestInfo(candidateApi, sessionId, prevCd) {
  let info = null;
  await expect.poll(async () => {
    info = (await candidateApi.get('/populated-session', { session_id: sessionId })).item.test_info || {};
    return info.last_cd && info.last_cd !== prevCd;
  }, { timeout: 30_000, message: `VsSession ${sessionId}: новый test_info` }).toBe(true);
  return info;
}

test.describe.serial('sql-vs-course-flow', () => {
  /** @type {import('@playwright/test').Page} */
  let page;
  let api;
  /** @type {import('@playwright/test').Page} — кандидат в клиенте inter-ca */
  let cPage;
  let candidateApi;
  let dockerM;

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
    // VS-сессии кандидата гасим штатным путём docker-m (контейнеры, сеть, тома SQL).
    for (const s of flow.vsSessions || []) {
      await dockerM?.kill(s.session_id).catch((e) => console.log(`kill ${s.session_id}: ${e.message}`));
    }
    // Всё, что завёл прогон, удаляем из базы — и при упавшем шаге: что успели
    // создать, то и лежит в flow.
    if (api) {
      await purgeE2eRun(api, {
        courses: [flow.courseId],
        modules: [flow.courseModuleId],
        questions: [flow.questionId],
        groups: [flow.vsTaskGroupId],
        tasks: [flow.vsTaskId],
        sessions: (flow.vsSessions || []).map((s) => s._id),
      }, { candidateId: flow.candidate?._id, since: flow.ts, log: (m) => console.log(m) })
        .catch((e) => console.log(`purge e2e: ${e.message}`));
    }
    await dockerM?.dispose();
    await candidateApi?.dispose();
    await cPage?.context().close();
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
      const question = await createQuestion(page, { type: 'task', name: flow.name('вопрос: посчитать пользователей старше 30') });
      flow.questionId = question._id;
      expect(question.type).toBe('task');

      // Квиз: без валидного квиза у вопроса VS-задача в тренировку не попадает
      // (api ctrls/course.js, /api/load-quizes-by-module).
      await addQuestionQuiz(page, api, flow, buildQuiz());

      // Раздел «VS задачи» страницы вопроса (#4024): «Привязать» группу → флаг «Все».
      await page.goto(`${ADMIN_URL}/theme-question/${question._id}`);
      const conf = page.locator('#aq-sec-vstasks [data-testid="vs-configurator-inline"]');
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
      await createModuleWithQuestion(page, api, flow);
    });

    test('5. Курс с модулем, статус «Актив»', async () => {
      await createActiveCourse(page, api, flow);
    });

    test('6. Запись кандидата на курс', async () => {
      await enrollCandidate(page, api, flow);

      // Итог подготовки: тренировка модуля отдаёт и квиз вопроса, и VS-задачу группы.
      // VS-задачи идут в pubQuizes после квизов, ключом opts.quiz = vs_<id группы>.
      const training = await api.get('/load-quizes-by-module', { _id: flow.courseModuleId });
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId]);
      const vs = (training.pubQuizes || []).filter((it) => (it.opts || {}).quiz === `vs_${flow.vsTaskGroupId}`);
      expect(vs).toHaveLength(1);
      expect(vs[0].item.info_arr[0]).toMatchObject({ task_id: flow.vsTaskId, lng: 'sql' });
      const { name, ...ids } = flow;
      console.log('sql-vs-course-flow ids:', JSON.stringify(ids));
    });
  });

  test.describe('candidate', () => {
    const courseRow = () => cPage.locator(`[data-testid="course-list-item"][data-course-id="${flow.courseId}"]`);
    const topic = () => cPage.locator(`[data-testid="course-topic"][data-question-id="${flow.questionId}"]`);
    const moduleItem = () => cPage.locator(`[data-testid="course-module"][data-module-id="${flow.courseModuleId}"]`);
    const vsTask = () => cPage.locator('[data-testid="vs-task"]');
    const vsResult = () => vsTask().locator('[data-testid="vs-task-result"]');

    async function openCourse() {
      await cPage.goto('/courses');
      await expect(courseRow()).toContainText(flow.name('курс'));
      const details = waitApi(cPage, 'GET', '/get-my-course-details', (u) => u.searchParams.get('_id') == flow.courseId);
      // В строке две ссылки на курс: название и «Продолжить» — жмём название.
      await courseRow().getByRole('link', { name: flow.name('курс') }).click();
      await details;
      await cPage.waitForURL(`**/courses/${flow.courseId}`);
    }

    test.beforeAll(async ({ browser }) => {
      candidateApi = await createUserApi(candidateCreds());
      dockerM = await createDockerM();
      // Без docker-m SQL-задачу не решить — падаем до прохождения курса, а не на шаге 10.
      await dockerM.assertUp();
      cPage = await (await browser.newContext({ baseURL: BASE_URL })).newPage();
    });

    test('7. Кандидат видит тестовый курс и открывает его', async () => {
      await login(cPage, candidateCreds());
      await openCourse();
      await expect(moduleItem()).toContainText(flow.name('модуль'));
      await expect(moduleItem()).toHaveAttribute('data-done', 'false');
    });

    test('8. Глава с вопросом: материал', async () => {
      // Первая глава модуля открыта сразу (PreviewCourseModule), следующая и
      // итоговая проверка — под замком, пока глава не сдана.
      await topic().click();
      const chapter = cPage.locator(`[data-testid="course-chapter"][data-question-id="${flow.questionId}"]`);
      await expect(chapter).toContainText('посчитать пользователей старше 30');
      await expect(topic()).toHaveAttribute('data-done', 'false');
      await expect(cPage.locator('[data-testid="course-module-check"]')).toHaveAttribute('data-open', 'false');
    });

    test('9. Проверка главы: квиз, затем VS-задача группы', async () => {
      // «Проверить знания» главы — CourseQuiz с questionId: /api/load-quizes-by-module
      // с question, у VS-группы флаг course_test (в части 1 включён «Все»).
      const loaded = waitApi(cPage, 'GET', '/load-quizes-by-module', (u) => u.searchParams.get('question') == flow.questionId);
      await cPage.locator(`#course-quiz-open-question-${flow.questionId}`).click();
      const training = await (await loaded).json();
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId]);
      expect(training.pubQuizes.map((it) => it.opts.quiz)).toEqual([flow.quizId, `vs_${flow.vsTaskGroupId}`]);

      await expect(cPage.locator('[data-testid="train-item"]')).toHaveAttribute('data-quiz-key', String(flow.quizId));
      await answerQuiz(cPage, String(countOlder()));

      // Верный ответ сам уводит к следующему заданию — VS-задаче, ключ истории vs_<группа>.
      const item = cPage.locator('[data-testid="train-item"]');
      await expect(item).toHaveAttribute('data-quiz-key', `vs_${flow.vsTaskGroupId}`);
      await expect(item).toHaveAttribute('data-answer-type', 'vs_task');
      await expect(vsTask()).toHaveAttribute('data-task-id', String(flow.vsTaskGroupId));
      await expect(vsTask()).toContainText(flow.name('группа SQL'));
      await expect(vsTask()).toHaveClass(/vs-task-sql/);
      await expect(vsResult()).toHaveAttribute('data-status', 'none');
    });

    test('10. SQL-задача: сессия, неверное и верное решение', async () => {
      test.setTimeout(VS_START_TIMEOUT + 2 * VS_TESTS_TIMEOUT);

      // VsTaskRun → /pre-start-session (без exam_id) → /exec-start-session → iframe.
      const pre = waitApi(cPage, 'GET', '/pre-start-session');
      const started = cPage.waitForResponse((r) => new URL(r.url()).pathname === '/api/exec-start-session', { timeout: VS_START_TIMEOUT });
      await vsTask().locator('[data-testid="vs-task-open"]').click();
      const preRes = await pre;
      const q = new URL(preRes.url()).searchParams;
      expect({ group: q.get('task_group_id'), lng: q.get('lng'), exam: q.get('exam_id') }).toEqual({ group: String(flow.vsTaskGroupId), lng: 'sql', exam: '' });
      const { session_id: sessionId, session } = await preRes.json();
      expect(sessionId).toBeTruthy();
      flow.vsSessions = [...(flow.vsSessions || []), { _id: session._id, session_id: sessionId }];

      const startInfo = await (await started).json();
      expect(startInfo.err_obj, `docker-m не поднял сессию: ${JSON.stringify(startInfo.err_obj)}`).toBeFalsy();
      await expect(vsTask()).toHaveAttribute('data-phase', 'ready', { timeout: 15_000 });
      await expect(vsTask().locator('iframe')).toHaveAttribute('src', /tkn=/);
      // Редактор открывается на весь экран поверх страницы; результат тестов и
      // «Далее» — под ним, кандидат сворачивает редактор.
      await expect(vsTask().locator('.vs-task-frame-full')).toBeVisible();
      await vsTask().locator('[data-testid="vs-task-collapse"]').click();
      await expect(vsTask().locator('.vs-task-frame-full')).toHaveCount(0);
      // Сессия тренировки — ключ 'train' (не экзамен), её подхватит и итоговая проверка.
      const saved = await cPage.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), `vs-session-train-${flow.vsTaskGroupId}`);
      expect(saved).toMatchObject({ session_id: sessionId, lng: 'sql' });

      await dockerM.waitTaskFiles(sessionId, SQL.file);
      let prevCd = null;

      // Негатив: неверный запрос → status 'err', passed < total.
      await dockerM.writeFile(sessionId, SQL.file, SQL.wrong);
      const bad = await dockerM.runSqlTests(sessionId, { timeoutMs: VS_TESTS_TIMEOUT });
      expect(bad.result.total).toBeGreaterThan(0);
      expect(bad.result.passed).toBeLessThan(bad.result.total);
      await saveSessionResult(sessionId, bad.info);
      const badInfo = await waitTestInfo(candidateApi, sessionId, prevCd);
      expect(badInfo.status).toBe('err');
      expect(badInfo.details.passed).toBeLessThan(badInfo.details.total);
      prevCd = badInfo.last_cd;
      await vsTask().locator('[data-testid="vs-task-refresh"]').click();
      await expect(vsResult()).toHaveAttribute('data-status', 'err');
      await expect(vsResult()).toHaveAttribute('data-passed', String(badInfo.details.passed));

      // Верное решение → status 'ok', passed == total > 0.
      await dockerM.writeFile(sessionId, SQL.file, SQL.solution);
      const good = await dockerM.runSqlTests(sessionId, { timeoutMs: VS_TESTS_TIMEOUT });
      expect(good.result.passed).toBe(good.result.total);
      await saveSessionResult(sessionId, good.info);
      const okInfo = await waitTestInfo(candidateApi, sessionId, prevCd);
      expect(okInfo.status).toBe('ok');
      expect(okInfo.details.total).toBeGreaterThan(0);
      expect(okInfo.details.passed).toBe(okInfo.details.total);
      flow.vsTestInfo = { status: okInfo.status, passed: okInfo.details.passed, total: okInfo.details.total };

      await vsTask().locator('[data-testid="vs-task-refresh"]').click();
      await expect(vsResult()).toHaveAttribute('data-status', 'ok');
      await expect(vsResult()).toHaveAttribute('data-passed', String(okInfo.details.total));
      await expect(vsResult()).toHaveAttribute('data-total', String(okInfo.details.total));
      await expect(vsTask().locator('[data-testid="vs-task-next"]')).toHaveClass(/btn-primary/);
    });

    test('11. Глава засчитана, итоговая проверка модуля (edu) — модуль сдан', async () => {
      // «Далее» на VS-задаче — последнее задание, проверка главы заканчивается.
      // VS-задача входит в процент сдачи (#4030): /api/load-quizes-by-module
      // отдаёт её в pubQuizes вне quizes, а знаменатель процента — quizes. Сдача главы
      // и модуля зависит только от квизов (total = 1 — один наш квиз).
      const qSaved = waitApi(cPage, 'POST', '/save-course-module-question-results');
      await vsTask().locator('[data-testid="vs-task-next"]').click();
      const qBody = (await qSaved).request().postDataJSON();
      expect(qBody).toMatchObject({ question: flow.questionId, quizPerc: 100, total: 2, status: 'ok', courseUserId: flow.courseUserId });
      const result = cPage.locator('[data-testid="course-quiz-result"]');
      await expect(result).toHaveAttribute('data-perc', '100');
      await cPage.locator('#course-quiz-finish').click();

      await expect(topic()).toHaveAttribute('data-done', 'true');
      await expect(cPage.locator('[data-testid="course-module-check"]')).toHaveAttribute('data-open', 'true');

      // Итоговая проверка модуля: CourseQuiz без questionId, флаг edu у VS-группы.
      const loaded = waitApi(cPage, 'GET', '/load-quizes-by-module', (u) => u.searchParams.get('question') === '0' && u.searchParams.get('_id') == flow.courseModuleId);
      await cPage.locator(`#course-quiz-open-module-${flow.courseModuleId}`).click();
      const training = await (await loaded).json();
      expect((training.quizes || []).map((it) => it._id)).toEqual([flow.quizId]);
      expect(training.pubQuizes.map((it) => it.opts.quiz)).toEqual([flow.quizId, `vs_${flow.vsTaskGroupId}`]);

      await answerQuiz(cPage, String(countOlder()));
      await expect(cPage.locator('[data-testid="train-item"]')).toHaveAttribute('data-quiz-key', `vs_${flow.vsTaskGroupId}`);
      // Та же сессия тренировки (ключ 'train'): результат решения виден без перезапуска.
      await expect(vsResult()).toHaveAttribute('data-status', 'ok');

      const mSaved = waitApi(cPage, 'POST', '/save-course-module-results');
      await vsTask().locator('[data-testid="vs-task-next"]').click();
      const mBody = (await mSaved).request().postDataJSON();
      expect(mBody).toMatchObject({ courseModule: flow.courseModuleId, quizPerc: 100, total: 2, status: 'ok' });
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
    });

    test('12. Повторный вход — прогресс курса сохранился', async () => {
      await cPage.context().clearCookies();
      await cPage.evaluate(() => localStorage.clear());
      await login(cPage, candidateCreds());
      await cPage.goto('/courses');
      // Процент изучения: модуль + его глава, оба сданы.
      await expect(courseRow()).toHaveAttribute('data-perc', '100');
      await openCourse();
      await expect(moduleItem()).toHaveAttribute('data-done', 'true');
      await expect(topic()).toHaveAttribute('data-done', 'true');
      await expect(cPage.locator('[data-testid="course-module-check"]')).toHaveAttribute('data-open', 'true');
      const { name, ...ids } = flow;
      console.log('sql-vs-course-flow ids:', JSON.stringify(ids));
    });
  });
});
