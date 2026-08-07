# Карта функционала admin-фронтенда (inter-ca)

Снято по состоянию на 2026-08-07, ветка `new_exam`. Цель — база для последующей
разбивки на задачи и e2e-покрытия (Cypress/Playwright), чтобы не тыкать всё руками.

Для каждого раздела: роут(ы), ключевые файлы, что делает, и пометка **e2e**
с грубой оценкой сложности автоматизации.

---

## 1. Авторизация и сессия
- `login`, `agreement` — `libs/Login/Login.js`, `comps/Agreement.js`
- `AutoConfirm.js` — автоподтверждение (email-ссылка?)
- Токен — `libs/user/user.js` (`get_token`, `on_refresh_token`, `logout`), 401 → авто-логаут в `libs/http/http.js`
- **e2e**: лёгкий, база для всех остальных сценариев (login-фикстура/сессия перед каждым тестом)

## 2. Dashboard / главная (`main`)
- `TrainMethods/CoursesList.js` — список курсов, прогресс, виджет `EvaluationWidget` (ссылка на `/evaluations` + счётчик новых оценок)
- `comps/Dashboard.js` — отдельный роут `dashboard` (похоже, старая/альтернативная версия — сверить, актуальна ли)
- **e2e**: средний — в основном чтение данных, но много условного рендера по прогрессу/фичефлагам

## 3. Курсы и обучение
- `courses` → `TrainMethods/CoursesListOld.js`, `courses/:id` → `Suggest/CourseDetails.js`
- `Suggest/CourseQuiz.js`, `Suggest/QuizTraining.js`, `Suggest/PreviewCourseModule.js` — прохождение модулей/квизов курса
- `TrainMethods/Train.js` + `TrainPage.js` (роут `train`) — общий "тренировочный" runner, переиспользуется и в RunExam
- `TrainMethods/AudioShort/*` — аудио-практика (запись/воспроизведение ответов)
- **e2e**: сложный — таймеры, аудио, много веток answerType (quiz/audio/code)
- ⚠️ Нашёл мимоходом: `<TrainPage/>` в App.js:527 стабильно кидает React-warning "type is invalid" в консоли на КАЖДОЙ странице (не только `/train`) — похоже, битый экспорт. Не чинил, не по текущей задаче, но стоит завести отдельным тикетом.

## 4. Мои предложения (`suggestions`)
- CRUD-таблица через `libs/DefList`/`DefOne` (`url: /my-suggestion`), форма — `Suggest/SuggestionItem.js`
- Статусы: `edit → sent → approved/canceled`
- **e2e**: лёгкий — стандартный CRUD-паттерн, много таких таблиц ниже

## 5. Заявки (`requests`)
- CRUD `/my-client-req`, статусы `open → answered → closed`
- Поля: markdown-вопрос, urgency, markdown-ответ (readonly для юзера)
- **e2e**: лёгкий

## 6. Интервью — НЕ mock (`interviews`)
- CRUD `/my-interview`, форма `Interview/Interview.js`
- Статусы: `waiting → offer / next_stage / bad`
- Отдельная сущность от Mock-Интервью ниже, легко перепутать по названию
- **e2e**: лёгкий-средний

## 7. Mock-интервью (AI, голос) — `mock-interviews`, `mock-interviews/:id`
- `MockInterview/MockInterview.js` + `components/*`
- Флоу: reserve слота (`ExamSlot`, 1 на interviewId) → бэкенд создаёт одноразовый `embed_url` (issuer-токен `ITK_EMBED_API_KEY`, контракт `docs/contracts/embed-interview-iframe.md` в itk-live) → iframe на `interview.infrastruct.ru` → голосовая сессия → завершение (`itk.interview.session_closed` / heartbeat-фолбэк) → результаты (`MockInterviewResults`, live SSE не используется, обычный fetch)
- Release слота: явное закрытие, unmount, `pagehide`+`keepalive`, TTL 30 мин на бэкенде как подстраховка
- **e2e**: САМЫЙ сложный кусок проекта — реальный голос/аудио через iframe стороннего сервиса не проездить в headless. Тестировать можно только замокав postMessage-контракт (`itk.interview.ready/error/session_closed`) и embed-сессию на своём бэкенде — то есть e2e без реального itk-live. Это отдельная, не быстрая задача.
- Вся история фиксов этого модуля — в Trello-карточке `Mock Interview / Evaluate / Exam — prod readiness fixes` (PAUL_DEV/IN_PROGRESS)

## 8. Экзамены (`quiz` список, `quiz/:id` прохождение)
- CRUD `/my-exam`, статусы `waiting → started → submitted`
- Прохождение — `RunExam/RunExam.js`: таймер (`CountDown`), квиз-часть + код-задачи (`Suggest/CodeRun.js`), автосейв каждый чих (`/update-exam`)
- Отдельно: `/run`, `/run-by-quiz` — standalone code runner вне контекста экзамена
- **e2e**: сложный — таймер, докер-исполнение кода (`js-exec-dockers` на бэке, не проверял в стейджинге), много состояний (active/pending/submitted)

## 9. Оценки ИИ (`evaluations`, `evaluations/:id`)
- `EvaluationList/EvaluationList.js` — группировка по экзамену/модулю
- `EvaluationDetail/EvaluationDetail.js` — детали + **live-статус через SSE** (`libs/sse/sse.js`) + retry для `error`
- Статусы: `pending → processing → done/error`
- **e2e**: средний — SSE в headless-браузере тестируется нормально (EventSource работает в Cypress/Playwright), но нужен способ довести оценку до нужного статуса без ожидания реального AI-пайплайна (мок бэкенда или прямая правка БД в фикстуре)
- ⚠️ Не закрыт вопрос: `/evaluate-list` без пагинации — см. Trello

## 10. Медиа
- `video` → `UploadVideo.js`, `file` → `UploadFile.js`, `mic` → `MicTest.js`
- **e2e**: средний — реальная загрузка файлов/доступ к микрофону, в CI обычно мокается

## 11. Поиск (`search`)
- `Search.js` — глобальный поиск по модулям
- **e2e**: лёгкий

## 12. Карьерный трек / CV (`temp/features-tree`, `temp/projects`)
- `CvTree/Tree.js`, `CvTree/ActiveProjects.js`
- Виден в меню только при `user.customData.isCV` — фиче-флаг на конкретных пользователях
- **e2e**: нужен тестовый юзер с этим флагом, иначе раздел просто не появится в меню

## 13. Профиль (`profile`)
- `comps/Profile.js`
- **e2e**: лёгкий

## 14. Публичная оферта (`publicOffer`)
- Статическая страница, `PublicOffer`
- **e2e**: не нужен (статика)

---

## Наблюдения по инфраструктуре (не функционал, но важно для e2e-стенда)
- Домены/бэкенд резолвятся по хосту в `admin_env.js` (`local` / `staging` / `demo` / `academy` / `aqa` / `kedu` / `def`) — для CI/e2e стенда нужен свой ключ или `localhost`
- Уведомления — `global.notify` через vNotify (см. `admin/public/css/vNotify.css`), не React-компонент — для e2e читать через DOM-селекторы `.vnotify-item`, не через RTL
- Много CRUD-разделов (suggestions/requests/interviews/quiz/mock-interviews) идут через один и тот же generic `libs/DefList` + `libs/DefOne` — вероятно, стоит написать **один параметризованный e2e-хелпер** "открыть таблицу → отфильтровать → открыть карточку" вместо дублирования на каждый раздел

## Предлагаемая приоритизация e2e (от простого/ценного к сложному)
1. Login + generic CRUD-хелпер (suggestions/requests как эталон) — фундамент для всего остального
2. Evaluations: список → деталь → live-статус через SSE (мокнутый бэкенд)
3. Mock-интервью: happy path с замоканным embed-контрактом (не трогая реальный itk-live)
4. RunExam: прохождение простого квиза без код-задач (без докера)
5. Остальное — по мере необходимости
