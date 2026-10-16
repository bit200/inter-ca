// Шаги подготовки курса через UI админки itk-platform, общие для сквозных потоков
// sql-course-flow (браузерная SQL-задача) и sql-vs-course-flow (VS Code): квиз к
// вопросу, модуль с вопросом, курс «Актив» с модулем, запись кандидата на курс.
// Каждый шаг кладёт созданные _id в flow и сверяет итог через API админа.
const { expect } = require('@playwright/test');
const { ADMIN_URL } = require('./env');

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

function waitApi(page, method, apiPath, predicate = () => true) {
  return page.waitForResponse((r) => r.request().method() === method
    && new URL(r.url()).pathname === `/api${apiPath}` && predicate(new URL(r.url()), r.request()));
}

// Вопрос через «+ Добавить» в списке вопросов: тип выбирается сразу при создании.
async function createQuestion(page, { type, name }) {
  await page.goto(`${ADMIN_URL}/theme-question`);
  await page.locator('[data-testid="table-add-button"]').click();
  const modal = page.locator('[data-testid="table-modal"]');
  await modal.locator(`[data-testid="question-create-type-${type}"]`).click();
  await modal.locator('[data-testid="question-create-name"] textarea.w-md-editor-text-input').fill(name);
  return submitCreate(page, '/theme-question');
}

// Квиз к вопросу со страницы вопроса: один верный вариант из quizData.variants.
// Валидный квиз — минимум 3 варианта и ровно один верный (api dbsInit/quizDbs.js).
// Аудио-квиз, который API сам заводит вопросу (ThemeQuestion.postSave, specialType
// 'general'), выключается: в проверке модуля остаётся ровно наш квиз, и состав не
// зависит от shuffle при moduleQuizSize = 1.
async function addQuestionQuiz(page, api, flow, quizData) {
  await page.goto(`${ADMIN_URL}/theme-question/${flow.questionId}`);
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
  await page.locator('[data-testid="quiz-name"] textarea.w-md-editor-text-input').fill(quizData.name);
  const list = page.locator('[data-testid="quiz-variations"]');
  for (const [ind, v] of quizData.variants.entries()) {
    await list.locator('.btn-push-add').last().click();
    const row = list.locator('.arr-item').nth(ind);
    await row.locator('[data-testid="quiz-variation-name"] textarea').fill(v.text);
    if (v.isCorrect) {
      await row.locator('[data-testid="quiz-variation-correct"] input[type="checkbox"]').click();
    }
  }
  await expect.poll(async () => {
    const q = await api.one('/quiz', quiz._id);
    return { isValid: q.isValid, question: q.question, correct: (q.variations || []).filter((it) => it.isCorrect).length };
  }, { timeout: 15_000, message: 'квиз сохранился валидным' }).toEqual({ isValid: true, question: flow.questionId, correct: 1 });

  const auto = ((await api.get('/quiz', { filter: { question: flow.questionId }, per_page: 100 })).items || [])
    .filter((it) => it._id !== quiz._id);
  flow.disabledQuizIds = [];
  for (const it of auto) {
    await page.goto(`${ADMIN_URL}/quizes/${it._id}`);
    await page.locator('[data-testid="quiz-status-unactive"]').click();
    await expect.poll(async () => (await api.one('/quiz', it._id)).status, { timeout: 10_000 }).toBe('unactive');
    flow.disabledQuizIds.push(it._id);
  }
  return quiz;
}

// Модуль: «Config Questions with Order» — поле ID в левой панели «Доступные» переносит
// вопрос в правую «В модуле» и сразу сохраняет модуль. Размеры проверок — по 1.
async function createModuleWithQuestion(page, api, flow) {
  await page.goto(`${ADMIN_URL}/course-module`);
  await page.locator('[data-testid="table-add-button"]').click();
  await page.locator('[data-testid="table-modal"] [data-testid="module-name"] input').fill(flow.name('модуль'));
  const mod = await submitCreate(page, '/course-module');
  flow.courseModuleId = mod._id;

  await page.goto(`${ADMIN_URL}/course-module/${mod._id}`);
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
  return fresh;
}

// Курс со статусом 'active' (CourseStatuses: в активных и в админке) и модулем.
async function createActiveCourse(page, api, flow) {
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
  expect(fresh.status).toBe('active');
  expect(fresh.modules.map((it) => Number(it.module))).toEqual([flow.courseModuleId]);
  return fresh;
}

// Запись на курс штатным путём админки: «Статистика» пользователя → вкладка courses →
// «Добавить курс» (POST /api/add-user-course: CourseUser status 'active' + пересборка
// истории курса). Кандидату курс показывают именно по активному CourseUser; inviteId
// курса API и клиенты не читают — ссылки-приглашения нет.
async function enrollCandidate(page, api, flow) {
  await page.goto(`${ADMIN_URL}/user-stats-new#user=${flow.candidate._id}&tab=courses`);
  await page.locator('[data-testid="user-course-add-open"]').click();
  const select = page.locator('[data-testid="user-course-add-select"]');
  await expect(select.locator(`option[value="${flow.courseId}"]`)).toHaveCount(1);
  await select.selectOption(String(flow.courseId));
  await Promise.all([
    waitApi(page, 'POST', '/add-user-course'),
    page.locator('[data-testid="user-course-add-submit"]').click(),
  ]);
  await expect(page.locator(`[data-testid="user-course-row"][data-course-id="${flow.courseId}"]`)).toBeVisible();

  const links = (await api.get('/course-user', { filter: { user: flow.candidate._id, course: flow.courseId } })).items || [];
  expect(links).toHaveLength(1);
  expect(links[0].status).toBe('active');
  expect(links[0].questions.map(Number)).toContain(flow.questionId);
  flow.courseUserId = links[0]._id;
  return links[0];
}

module.exports = {
  submitCreate, waitPut, waitApi, createQuestion, addQuestionQuiz, createModuleWithQuestion, createActiveCourse, enrollCandidate,
};
