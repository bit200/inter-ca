# e2e

Playwright-тесты клиента (`admin/` этого репозитория) и сквозной поток через админку
itk-platform. Запускаются **вручную**, не в CI (см. `../E2E_TEST_PLAN.md` — почему).

## Установка

```bash
cd e2e
npm install
npm run install-browsers   # один раз, ставит headless Chromium
```

## Запуск

Клиент (`admin/` этого репозитория, pm2 `itk-client`) должен быть уже поднят
локально — по умолчанию `http://localhost:8001`, другой адрес — `E2E_BASE_URL`.

Без `E2E_MANUAL=1` Playwright не стартует (защита от случайного автозапуска: каждый
прогон создаёт `e2e-*` записи на стенде). `test:manual`, `test:ui`, `test:headed` ставят
переменную сами; для `npm test` — `E2E_MANUAL=1 npm test`.

```bash
npm run test:manual          # все тесты, headless
E2E_MANUAL=1 npm test -- sql-course-flow  # один файл
npm run test:ui              # с UI-раннером Playwright (удобно отлаживать)
npm run test:headed          # с видимым браузером
npm run report               # открыть html-отчёт последнего прогона
npm run test:unit            # юнит-тесты хелперов (node --test, без браузера)
```

Креды и адреса нигде в репозитории не хранятся — только env или локальный
`e2e/.env` (он в `.gitignore`, подключается в `playwright.config.js` через dotenv).

| Переменная | По умолчанию | Что это |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:8001` | клиент inter-ca |
| `E2E_ADMIN_URL` | `http://localhost:8002` | админка itk-platform (`itk-platform-en/interviews/admin`, pm2 `itk-admin`) |
| `E2E_API_URL` | `http://localhost:6057` | API itk-platform (pm2 `itk-api`) |
| `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD` | — | пользователь с ролью `admin` |
| `E2E_USERNAME` / `E2E_PASSWORD` | — | тестовый кандидат |
| `E2E_DOCKER_M_URL` | `http://localhost:3010` | docker-m: VS Code-сессия кандидата в sql-course-flow |
| `E2E_CLEANUP_HOURS` | `6` | e2e-сущности старше стольких часов удаляются перед прогоном |

## Сквозной поток sql-course-flow

`tests/sql-course-flow.spec.js` — первый сквозной поток платформы. Часть 1
(`admin setup`) всё заводит через UI админки: SQL-задачу быстрой формой → VS-группу
с этой задачей (lng `sql`) → вопрос-задачу с квизом и привязкой группы (флаг «Все»)
→ модуль с вопросом → курс «Актив» с модулем → запись кандидата на курс. Часть 2
(`candidate`) проходит курс кандидатом в клиенте: курс в списке → глава → «Проверить
знания» (квиз, затем VS-задача) → решение SQL-задачи в VS Code-сессии (неверное и
верное) → итоговая проверка модуля → повторный вход, прогресс на месте.

Весь поток одной командой (≈45 с):

```bash
cd e2e && npm run test:sql-flow          # = E2E_MANUAL=1 playwright test sql-course-flow
E2E_BASE_URL=http://localhost:7594 npm run test:sql-flow   # клиент из своего worktree
```

Должны быть подняты:

- `itk-api` — API на `:6057` (`itk-platform-en/interviews/api`);
- `itk-admin` — админка на `:8002`, с разметкой testid (см. ниже);
- клиент на `:8001` (`E2E_BASE_URL`) — `admin/` этого репозитория с разметкой testid;
- docker-m на `:3010` (`E2E_DOCKER_M_URL`) — собирает файлы SQL-задачи
  (`POST /create-sql-task-files`) и поднимает VS Code-сессию кандидата (контейнеры
  `<session_id>-main` и `-db`). Архив задачи он кладёт в
  `docker-m/_gen_sources/gzip_tasks/`, а саму папку не создаёт: без неё сессия
  стартует без файлов задачи (тест падает на шаге 10 с этой подсказкой) —
  один раз `mkdir -p _gen_sources/gzip_tasks` в docker-m;
- Postgres SQL-раннера (`SQL_RUNNER_DSN` в `.env` API, поднимается
  `api/scripts/sql-runner-db.sh`) — эталонный результат и превью в форме.

Раннер и docker-m тест проверяет до сборки (`GET /api/sql-runner-status`,
`GET /api/vs-image/built`) и падает с понятным текстом, что поднять, а не по таймауту.
Сборку файлов (`info.sql_quick_sync.status`) ждёт с явным локальным таймаутом 120 с;
`status: 'error'` — сразу падение с текстом ошибки сборки.

Тестовые пользователи (один раз на стенд). Кандидат и админ — отдельные
пользователи, реальных не трогаем:

```bash
curl -X POST localhost:6057/api/create-user-from-template -H 'Content-Type: application/json' \
  -d '{"data":{"login":"e2e-admin","pass":"<пароль>","first_name":"E2E","surname":"admin"}}'
curl -X POST localhost:6057/api/create-user-from-template -H 'Content-Type: application/json' \
  -d '{"data":{"login":"e2e-candidate","pass":"<пароль>","first_name":"E2E","surname":"candidate"}}'
mongosh estimation-code --eval 'db.users.updateOne({username:"e2e-admin"},{$set:{roles:["admin"]}})'
```

Как устроено:

- **Порядок и _id.** `test.describe.serial` в одном файле: шаги идут по порядку,
  упавший шаг останавливает остальные. Созданные `_id` лежат в объекте `flow`
  (часть 2 читает его оттуда же) и пишутся в `test-results/sql-course-flow.json`.
  `_id` новой записи UI не показывает — тест берёт его из ответа `POST /api/<раздел>`.
- **Имена.** Все сущности — `e2e-sql-<timestamp> …`.
- **Уборка.** Перед прогоном под админом удаляются (CRUD `DELETE`, мягкое
  `is_removed`) курсы, модули, квизы вопросов, вопросы, группы и задачи с этим
  префиксом старше `E2E_CLEANUP_HOURS`; запись кандидата на такой курс снимается
  `POST /api/remove-user-course`. Записи без префикса не трогаются.
- **Запись на курс.** `inviteId` курса API и клиенты не читают — ссылки-приглашения
  нет. Штатный путь — «Статистика» пользователя → вкладка courses → «Добавить курс»
  (`POST /api/add-user-course`: `CourseUser` со `status: 'active'` и пересборкой
  истории курса). Кандидату курс виден именно по активному `CourseUser`.
- **VS-сессия кандидата (шаг 10).** Сессию поднимает сам клиент: кнопка
  «Открыть задачу в редакторе» в `VsTaskRun` → `/pre-start-session` (без `exam_id`,
  ключ `vs-session-train-<id группы>`) → `/exec-start-session` → iframe VS Code.
  Печатать в iframe тест не стал: штатного прогона SQL-тестов с записью
  `VsSession.test_info` нет (кнопка тестов в VS Code зовёт `/cmd/test.sh`, которого в
  SQL-образе нет; `full_test_new` docker-m берёт код из S3-патча). Поэтому
  `helpers/vsSession.js` делает то же, что docker-m и кандидат в терминале: пишет
  `queries/01_query.sql` в контейнер сессии (`GET :3010/api/cmd_run
  type=exec_session_cmd`), гоняет раннер сессии `node /cmd/sql_test.js` и сохраняет
  итог `POST /api/save-session-result` (тело как в docker-m `full_test_new`). Результат
  проверяется и в API (`GET /api/populated-session`: `status` `err` → `ok`,
  `passed == total > 0`), и в UI (`VsTaskRun`, «Обновить результат»). После прогона
  сессии убираются: `cmd_run type=kill_user_session` + мягкий `DELETE /api/vs-session`.
- **Сдача модуля.** VS-задача сейчас не входит в процент сдачи: `/api/load-quizes-by-module`
  отдаёт её в `pubQuizes`, а знаменатель — `quizes`. Глава и модуль засчитываются по
  квизам (`total: 1`), тест фиксирует это как текущее поведение.
- **Квизы вопроса.** VS-задача попадает в тренировку модуля, только если у вопроса
  есть валидный квиз (≥3 вариантов, ровно один верный). API сам заводит вопросу
  аудио-квиз — тест его выключает, чтобы при `moduleQuizSize = 1` тренировка была
  предсказуемой: наш квиз + VS-задача (`pubQuizes`, `opts.quiz = vs_<id группы>`).

## Конвенция testid

- `data-testid="..."` — там, где текст переведён/меняется, или элемент один из многих
  (строки таблиц, кнопки фильтров)
- `id="..."` — там, где id уже был нужен по функциональным причинам (см.
  `libs/Login/Login.js`, там `id` читается в `handleChange`), плюс `libs/Button`
  форвардит в DOM только `id`, не `data-testid` — если добавляете testid на
  Button-обёрнутую кнопку, используйте `id`.
- Общий CRUD-движок (`libs/DefList` + `libs/Table/*`) уже размечен — см.
  `helpers/table.js`. Для нового раздела на этом движке отдельная разметка обычно
  не нужна.

### Разметка админки itk-platform

Та же конвенция, плюс в общем движке админки (`interviews/admin/src/libs`):

- `Smart`: у поля конфига `testid` → `data-testid` на обёртке поля, у кнопок
  `type: 'group'` — `<testid>-<значение>` (напр. `course-status-active`); у
  `type: 'btn'` — `id` из `field.id`.
- `MyModal`: проп `testid` → `data-testid` на `.ReactModal__Content` (через `testId`
  react-modal: свой `data.testid` он перетирает). `Input`: проп `testid`.
- `Table`/`TableFilterBar`: `table-search-input`, `table-add-button`, `table-modal`,
  `#table-modal-submit` (Create/Save в модалке), `table-row[data-row-id]`.
  `DefOne`: `defone-save-top`, `defone-save-bottom`. `Login`: `#login-submit`.

Экраны потока: `stq-*` (быстрая SQL-форма), `vsg-*` и `custom-pull*` (VS-группа и
«Выбрать задачу»), `vs-configurator*`, `#vs-configurator-add-<id>`,
`#vs-flag-<группа>-<all|edu|course_test|exam>`, `quiz-*`, `#quiz-add-top`,
`question-create-*`, `module-*`, `sprint-*`, `course-*`, `user-course-*`. Полный
список с файлами — `interviews/admin/src/e2eSelectors.test.js`.

### Разметка клиента (sql-course-flow, часть 2)

`course-list-item[data-course-id][data-perc]` (список курсов), `course-module`,
`course-topic` (`data-done`), `course-module-check` (`data-open`), `course-chapter`,
`#course-quiz-open-question-<id>` / `#course-quiz-open-module-<id>` (Button — поэтому
`id`), `course-quiz-result[data-perc][data-ok]`, `#course-quiz-finish`, тренажёр
`train-item[data-quiz-key][data-answer-type]`, `quiz-answer`, VS-задача `vs-task`
(`data-phase`, `data-task-id`), `vs-task-open`, `vs-task-collapse` / `vs-task-expand`
(редактор на весь экран), `vs-task-next`, `vs-task-refresh`,
`vs-task-result[data-status][data-passed][data-total]`.
