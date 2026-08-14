const { test, expect } = require('@playwright/test');

// Баг: модалка "Результаты пробного экзамена" (TrainMethods/CoursesList.js,
// AutoInterview.js) рендерила список из одних прочерков вместо реальных ответов.
// Корень бага был не в GET /load-interview-details (он и так корректно матчит
// QuizHistory.autoInterview по строковому query-параметру - Mongoose кастует его
// в Number сам, см. схему в itk-platform-en/interviews/api/dbsInit/quizDbs.js), а
// в том, что POST /auto-interview (генерируемый initDb()-роутинг для модели
// AutoInterview) требовал admin-роль и 403-ил обычным кандидатам, из-за чего их
// ответы на пробном экзамене никогда не помечались autoInterview - и результаты
// экзамена было физически нечем показать. Фикс - новый, доступный обычным
// пользователям POST /create-auto-interview (см. itk-platform-en course.js) плюс
// обновлённый вызов на фронте (mainMethods.js:createAutoInterview).
//
// Этот тест закрывает то, что реально проверяемо без живого бэкенда: раз
// GET /load-interview-details возвращает данные (что бэкенд и так умеет, но
// раньше до него ответы просто не долетали), AutoInterview.js должен отрисовать
// реальную строку, а не прочерк, и кнопка play должна дергать myPlayer именно
// формой {user, hash} (запрос на подписанный URL /audio/:user/:hash), а не
// устаревшей {path: '/user/hash.webm'}, которая больше не соответствует тому, как
// сейчас отдаётся аудио (см. AudioShort/Player.js - {user,hash} ходит за
// подписанным URL с Authorization, {path} бьёт по статике напрямую и без токена).

const FAKE_TOKEN = 'e2e-fake-token';
const FAKE_REFRESH = 'e2e-fake-refresh-token';
const FAKE_USER = { _id: 1002, first_name: 'E2E', last_name: 'Tester', roles: ['user'] };

const INTERVIEW_ID = 4242;
const QUIZ_ID = 9001;
const ANSWER_USER = 1002;
const ANSWER_HASH = 'e2e-audio-hash-123';

function loadMyCoursesQResponse() {
  return {
    host: '',
    isHostAdmin: false,
    courses: [],
    fb: [],
    cdArr: [],
    userCourses: [],
    questionIds: [],
    result: { questions: [] },
    interviews: [
      { _id: INTERVIEW_ID, quizes: [QUIZ_ID], questions: [1], cd: new Date().toISOString(), info: {} },
    ],
  };
}

function loadInterviewDetailsResponse() {
  return [
    {
      _id: 555,
      quiz: QUIZ_ID,
      user: ANSWER_USER,
      hash: ANSWER_HASH,
      titleInfo: { title: 'E2E Test Question' },
      answerDetails: { recognizedText: 'E2E recognized answer text', rate: 5 },
      adminDetails: {},
    },
  ];
}

test('AutoInterview: реальный ответ рендерится вместо прочерка, play дергает myPlayer({user,hash})', async ({ page }) => {
  // Сидируем авторизацию до первого скрипта страницы (см. run-exam.spec.js).
  await page.addInitScript(
    ({ token, refresh, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: FAKE_TOKEN, refresh: FAKE_REFRESH, user: FAKE_USER }
  );

  // Catch-all первым, конкретные роуты ниже имеют приоритет (см. run-exam.spec.js).
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));

  await page.route('**/api/auth/on_refresh_token/**', (route) =>
    route.fulfill({ json: { token: FAKE_TOKEN, refresh_token: FAKE_REFRESH, user: FAKE_USER } })
  );

  // CoursesList.js:reloadAll грузит эти три параллельно при монтировании. http.js всегда
  // дописывает '?' + serialize(params) к GET-урлу (даже без параметров, см. http.js:33) -
  // без trailing ** паттерн без query-хвоста не матчится (см. run-exam.spec.js - тот же
  // трюк для /api/load-exam**).
  await page.route('**/api/load-my-courses-q**', (route) => route.fulfill({ json: loadMyCoursesQResponse() }));
  await page.route('**/api/load-my-courses-details-top-stats**', (route) => route.fulfill({ json: {} }));
  await page.route('**/api/load-my-courses-details-fb**', (route) => route.fulfill({ json: { fb: [] } }));

  // AutoInterview.js: GET /load-interview-details?_id=<interview._id>.
  await page.route('**/api/load-interview-details**', (route) => route.fulfill({ json: loadInterviewDetailsResponse() }));

  // Player.js's {user,hash} branch: fetch(VIDEO_DOMAIN + '/audio/:user/:hash', {headers:{authorization}})
  // -> ожидаем именно этот путь (без .webm и без прямого статического /audio/user/hash.webm).
  let audioRequestUrl = null;
  await page.route('**/audio/**', (route) => {
    audioRequestUrl = route.request().url();
    route.fulfill({ json: { url: 'https://example.invalid/signed-audio.mp3' } });
  });

  await page.goto('/main');

  // Вкладка "Пробный экзамен" (t('trialExam'), key 'inter' в CoursesList.js). Текст
  // "Пробный экзамен" встречается на странице не только в табе, но и в карточке
  // статистики - берём именно role=tab, чтобы не словить strict-mode violation.
  await page.getByRole('tab', { name: 'Пробный экзамен' }).click();

  // Interviews.js рисует по одной <tr> на interview - кликаем, открываем модалку.
  const interviewRow = page.locator('table tbody tr').first();
  await expect(interviewRow).toBeVisible();
  await interviewRow.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Главная проверка бага: реальная строка с данными, а не прочерк.
  await expect(dialog.locator('[data-testid="auto-interview-row"]')).toHaveCount(1);
  await expect(dialog.locator('[data-testid="auto-interview-dash"]')).toHaveCount(0);
  await expect(dialog.locator('[data-testid="auto-interview-row"]')).toContainText('E2E Test Question');
  await expect(dialog.locator('[data-testid="auto-interview-row"]')).toContainText('E2E recognized answer text');

  // Проверка аудио: play должен уйти по /audio/:user/:hash (форма {user,hash}),
  // а не собрать статический путь .../audio/user/hash.webm (устаревшая форма {path}).
  await dialog.locator('[data-testid="auto-interview-play"]').click();
  await expect.poll(() => audioRequestUrl).not.toBeNull();
  expect(audioRequestUrl).toContain(`/audio/${ANSWER_USER}/${ANSWER_HASH}`);
  expect(audioRequestUrl).not.toContain('.webm');
});
