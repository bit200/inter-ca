const { test, expect } = require('@playwright/test');

// Тикет 4 — RunExam, простой квиз без код-задач.
// quiz/:id -> RunExam/RunExam.js -> (answerType==='quiz') -> TrainMethods/Train.js ->
// Suggest/QuizPreviewNew.js (реально рендерит и принимает клик по варианту ответа) ->
// на submit -> RunExam.js:onSubmit -> GET /api/submit-task-by-user -> exam.status
// становится 'submitted' -> RunExam.js рендерит RunExam/SubmittedExamPreview.js,
// который для квиза переиспользует Suggest/RenderQuizResults.js (тот же
// QuizPreviewNew, но без isExam — реально красит выбранный вариант в
// correct/incorrect по его собственному isCorrect).
//
// Прочитан весь путь данных: useExamData.js (что грузит /load-exam и как раскладывает
// в exam/history/questionsDb/dbTasks), RunExam.js, Train.js, QuizPreviewNew.js,
// RenderQuizResults.js, SubmittedExamPreview.js — форма фикстур ниже собрана по
// реальным полям, которые эти компоненты читают, а не наугад.
//
// Логин: реальных кредов нет (см. helpers/auth.js — нужен E2E_USERNAME/PASSWORD).
// Вместо формы логина сидируем то же состояние, что кладёт туда
// admin/src/libs/user/user.js после успешного логина: localStorage.token,
// .refresh_token, .user (user.get_token()/get_info() читают ровно это, Root() в
// App.js редиректит на /login только если get_token() пуст) — через
// page.addInitScript до навигации, как и предложено в тикете.

const EXAM_ID = 555;
const QUIZ_ID = 2001;
const QUESTION_TEXT = 'Столица Франции?';
const CORRECT_ANSWER = 'Paris';
const WRONG_ANSWER = 'London';

const FAKE_TOKEN = 'e2e-fake-token';
const FAKE_REFRESH = 'e2e-fake-refresh-token';
const FAKE_USER = { _id: 'e2e-user', first_name: 'E2E', last_name: 'Tester', roles: ['user'] };

function buildQuizItem() {
  return {
    _id: QUIZ_ID,
    name: QUESTION_TEXT,
    answerType: 'quiz',
    variations: [
      { name: CORRECT_ANSWER, isCorrect: true },
      { name: WRONG_ANSWER, isCorrect: false },
    ],
  };
}

// Экзамен "в процессе": status НЕ должен матчить /unactive/ и НЕ /active|pending/ из
// RunExam.js (иначе вместо экрана прохождения покажется "ждите модератора"/"начать
// экзамен") — 'started' (тот же статус, что использует фильтр таблицы quiz, см.
// App.js top_filters) через оба regex проходит и сразу открывает экран вопроса.
// startCd/minutesStr — таймер (CountDown в RunExam.js) реально тикает и сам
// сабмитит по истечении; берём startCd=сейчас и minutesStr='600' (600 минут) —
// большой запас, чтобы таймер не истёк и не пересёк порог предупреждения "00:05"
// за время теста.
function baseExam(startCd) {
  return {
    _id: EXAM_ID,
    status: 'started',
    quizQuestionsCount: 1,
    quizQuestionsPlainPub: [{ item: buildQuizItem(), opts: { quiz: QUIZ_ID } }],
    tasksDb: [], // тикет 4: пустой tasksDb — нет код-задач, докер не нужен
    history: [],
    availableSubmitCount: 0, // прячем кнопку "Проверить результат" (attempt-to-run) — не участвует в акцептансе тикета, при 0 она не рендерится вовсе (см. canSubmit() в RunExam.js)
    submitCount: 0,
    submitDetails: {},
    startCd,
    minutesStr: '600',
    attemptInd: 0,
  };
}

// Экзамен "отправлен": SubmittedExamPreview.js берёт hasQuiz из exam.quizQuestionsPlain
// (не Pub!) и chosen-историю из history['-1'].quizHistory.history[quizId] (см.
// RenderQuizResults.js:getHist) — это то, что useExamData.js кладёт из exam.history
// (массив {_id, last}). chosen:{0:true} = выбран 1й вариант (Paris, index 0).
function submittedExam(startCd) {
  return {
    ...baseExam(startCd),
    status: 'submitted',
    quizQuestionsPlain: [buildQuizItem()],
    history: [
      {
        _id: -1,
        last: {
          quizHistory: {
            history: {
              [QUIZ_ID]: { chosen: { 0: true }, isCorrect: true, quizStatus: 'unknown' },
            },
          },
        },
      },
    ],
  };
}

test('квиз без код-задач: ответ на вопрос -> Завершить экзамен -> SubmittedExamPreview показывает выбранный ответ', async ({ page }) => {
  const startCd = Date.now();
  let submitted = false;

  // Сидируем авторизацию до первого скрипта страницы.
  await page.addInitScript(
    ({ token, refresh, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: FAKE_TOKEN, refresh: FAKE_REFRESH, user: FAKE_USER }
  );

  // Catch-all первым (регистрируется раньше -> в Playwright матчится последним,
  // т.е. специфичные роуты ниже имеют приоритет) — гасит всё остальное, что дергает
  // layout/user.js (напр. фоновый /api/auth/on_refresh_token до того, как мы его
  // переопределим специфичным роутом), чтобы не улетать в реальный бэкенд.
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));

  // user.js дергает /auth/on_refresh_token вскоре после загрузки модуля; если бы он
  // словил common catch-all с пустым {}, user.handle_login_response(r) переписал бы
  // localStorage token/user на "undefined" и сломал бы сидированную сессию.
  await page.route('**/api/auth/on_refresh_token/**', (route) =>
    route.fulfill({ json: { token: FAKE_TOKEN, refresh_token: FAKE_REFRESH, user: FAKE_USER } })
  );

  await page.route('**/api/load-exam**', (route) =>
    route.fulfill({ json: submitted ? submittedExam(startCd) : baseExam(startCd) })
  );

  // Train.js:onSetStartCd -> RunExam.js:onChangeHistory -> updateExam -> POST /update-exam
  // (дебаунс SEND_DELAY=1мс) — летит и при показе вопроса, и на каждый ответ.
  await page.route('**/api/update-exam', (route) => route.fulfill({ json: {} }));

  // Train.js:onSubmit шлёт POST на props.submitUrl || '/save-quiz-history' при ответе на вопрос.
  await page.route('**/api/save-quiz-history', (route) => route.fulfill({ json: {} }));

  // RunExam.js:onSubmit (кнопка "Завершить экзамен" после confirm) -> GET /submit-task-by-user.
  await page.route('**/api/submit-task-by-user**', (route) => {
    submitted = true;
    return route.fulfill({ json: submittedExam(startCd) });
  });

  await page.goto(`/quiz/${EXAM_ID}`);

  // Экран прохождения квиза: TrainMethods/Train.js -> QuizPreviewNew рендерит
  // варианты как .quiz-answer-it (существующий класс, testid не нужен —
  // выбираем по нему + тексту варианта).
  const parisOption = page.locator('.quiz-answer-it', { hasText: CORRECT_ANSWER });
  const londonOption = page.locator('.quiz-answer-it', { hasText: WRONG_ANSWER });
  await expect(parisOption).toBeVisible();
  await expect(londonOption).toBeVisible();

  // Таймер экрана — CountDown в RunExam.js читает getEndDate(exam) из
  // startCd+minutesStr; с 600-минутным запасом часы точно не "00:00".
  await expect(page.locator('.countdown')).not.toHaveText(/^00\s*:\s*00$/);

  await parisOption.click();
  // Во время экзамена (isExam=true) QuizPreviewNew.js намеренно не красит
  // correct/incorrect (не палит ответ), а вешает нейтральный класс "unknown" —
  // это подтверждает, что клик реально принят как ответ.
  await expect(parisOption).toHaveClass(/\bunknown\b/);

  // "Завершить экзамен" -> AutoConfirm.js модалка (role=dialog по умолчанию у
  // react-modal, MyModal.js его не переопределяет) -> кнопка t('confirm').
  await page.locator('#run-exam-complete-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Вы уверены, что хотите закончить экзамен'); // t('areYouSureToComplete')
  await dialog.getByRole('button', { name: 'Да, подтвердить' }).click(); // t('confirm')

  // exam.status стал 'submitted' -> RunExam.js рендерит SubmittedExamPreview.
  const submittedPreview = page.locator('[data-testid="submitted-exam-preview"]');
  await expect(submittedPreview).toBeVisible();

  // selectedType в SubmittedExamPreview.js инициализируется от exam.quizQuestionsPlain
  // в МОМЕНТ первого монтирования (submitLoading становится true раньше, чем
  // подъезжают свежие данные из повторного /load-exam) — так что дефолтная вкладка
  // не гарантированно 'quiz'. Кликаем по вопросу явно, чтобы не зависеть от гонки.
  await page.locator('[data-testid="submitted-question-nav-0"]').click();

  // Главная проверка тикета: реально отправленный ответ (Paris, index 0) виден в
  // SubmittedExamPreview именно как отправленный — RenderQuizResults.js передаёt
  // тот же QuizPreviewNew без isExam, и он красит chosen[ind] в correct/incorrect
  // по variations[ind].isCorrect. Paris была выбрана и она правильная -> "correct".
  // London не выбрана и она неправильная -> без correct/incorrect вовсе.
  const parisResult = page.locator('.quiz-answer-it', { hasText: CORRECT_ANSWER });
  const londonResult = page.locator('.quiz-answer-it', { hasText: WRONG_ANSWER });
  await expect(parisResult).toHaveClass(/\bcorrect\b/);
  await expect(londonResult).not.toHaveClass(/\b(correct|incorrect)\b/);

  // "Завершить экзамен" рендерится только в экране прохождения — его отсутствие
  // после submit дополнительно подтверждает, что мы больше не там.
  await expect(page.locator('#run-exam-complete-button')).toHaveCount(0);
});
