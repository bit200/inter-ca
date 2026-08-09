# План e2e-тестов (inter-ca/admin)

Playwright, запуск только руками (`e2e/`, см. `e2e/README.md`), в CI не подключено —
причина: часть флоу зависит от внешнего itk-live, который на этой неделе сам был
нестабилен (то 16с на статику, то не отвечал вовсе), гонять на этом CI-гейт бессмысленно.

Этот файл — план тикетов. Каждый тикет самодостаточен и рассчитан на то, что его
можно отдать отдельному агенту без остального контекста разговора — агент открывает
этот файл, читает свой тикет + раздел "Конвенции", и работает.

## Как работать с этим планом (для агента)

1. Прочитать раздел "Конвенции" целиком — там всё, что нужно знать про testid'ы,
   структуру `e2e/`, как мокать бэкенд.
2. Взять один тикет из списка ниже (или тот, что явно назначен).
3. Создать **новый** файл `e2e/tests/<name>.spec.js` — по умолчанию не трогать чужие
   файлы. Если для теста не хватает `data-testid` на компоненте — добавить его прямо
   в компонент (см. конвенцию), но только в том компоненте, который относится к
   твоему тикету, чтобы не конфликтовать с другими агентами, работающими параллельно.
4. Прогнать тест локально (`admin` должен быть поднят, `npm start` в `admin/`),
   убедиться, что зелёный.
5. Отметить тикет как сделанный в этом файле (просто дописать `[DONE]` после заголовка).

## Конвенции

**Стек**: `@playwright/test`, конфиг — `e2e/playwright.config.js`, `baseURL` из
`E2E_BASE_URL` (по умолчанию `http://localhost:3000`).

**testid**:
- `data-testid="..."` на переведённых/динамических/повторяющихся элементах
- `id="..."` там, где так уже сделано в коде (напр. `libs/Login/Login.js` читает
  `id` в `handleChange` — там это функционально важно, не просто для тестов)
- `libs/Button` форвардит в DOM только `id`, не `data-testid` — если вешаете testid
  на кнопку через `<Button>`, используйте `id`, не `data-testid`

**Уже размечено (можно использовать сразу, ничего добавлять не нужно)**:
- Login: `[data-testid="login-username"]`, `[data-testid="login-password"]`, `#login-submit`, ошибка — `.userErr`
- Общий CRUD-движок (`libs/DefList` + `libs/Table/*`, на нём suggestions/requests/interviews/quiz/mock-interviews-list):
  `[data-testid="table-search-input"]`, `[data-testid="table-add-button"]`,
  `[data-testid="table-filter-<key>-<value>"]` (и `-all` для дефолтной кнопки),
  `[data-testid="table-row"]` + `data-row-id` на каждой строке
  — хелпер уже готов: `e2e/helpers/table.js` (`search`, `clickAdd`, `clickFilter`, `rows`, `rowByText`, `openRowByText`)
- Mock-интервью: `[data-testid="mock-interview-start-button"]`, `[data-testid="mock-interview-start-error"]`,
  `[data-testid="mock-interview-overlay"]`, `[data-testid="mock-interview-embed-frame"]`
- Evaluations: `[data-testid="evaluate-status-card"]` (+ `data-status`), `[data-testid="evaluate-error-card"]`, `[data-testid="evaluate-retry-button"]`

**Логин**: `e2e/helpers/auth.js` → `login(page)`, креды из `E2E_USERNAME`/`E2E_PASSWORD` (env).

**Мокать бэкенд, а не поднимать реальный** — почти во всех тикетах используем
`page.route('**/api/...', route => route.fulfill({json: ...}))`, чтобы тест не зависел
от состояния реальной БД/внешних сервисов и был воспроизводим. Исключение — тикет 1
(там нужны реальные CRUD-разделы, но можно и с мок-данными, на усмотрение агента).

**Mock-интервью отдельно** — там ещё и iframe на чужой домен. Готовый хелпер
`e2e/helpers/mockInterviewFrame.js` → `mockInterviewBackend(page, {mockItem, events})`
мокает и наш бэкенд (`reserve`/`embed-session`/`release`/PUT), и сам домен
`interview.infrastruct.ru` — подсовывает фейковую HTML-страницу, которая по скрипту
шлёт `postMessage` события в родителя. Смотри JSDoc в файле, там пример форматов событий.

---

## Тикеты

### Тикет 1 — CRUD-разделы (suggestions/requests/interviews/quiz-list/mock-interviews-list)
**Файл**: `e2e/tests/crud-sections.spec.js`
**Цель**: убедиться, что общий движок реально работает на каждом из 5 разделов —
не логику каждого раздела досконально, а что таблица открывается, фильтр переключает
выдачу, поиск фильтрует, "+Добавить" открывает форму (там, где `woAdd` не стоит — у
mock-interviews и quiz оно `woAdd:true`, кнопки нет, это тоже стоит проверить явно).
**Разделы и урлы**: `/table` не относится, реальные — как в `App.js` (`global.CONFIG.urls`):
`suggestions` (`/my-suggestion`, кнопка добавить есть), `requests` (`/my-client-req`,
добавить есть), `interviews` (`/my-interview`, добавить есть), `quiz` (`/my-exam`,
`woAdd:true`, три статус-фильтра waiting/started/submitted), `mock-interviews`
(`/mock-interview/my-list`, `woAdd:true`, три статус-фильтра).
Сами роуты в UI открываются кликом по хедер-меню (см. `App.js` → `header` массив,
`name`→`url`), не как отдельные `page.goto` — свериться, что урл матчится.
**Acceptance**:
- для каждого раздела: строки таблицы видны (`table.rows(page)` > 0 либо явный "нет данных")
- фильтр по статусу реально меняет набор строк (используй `table.clickFilter`)
- поиск сужает выдачу (`table.search`)
- add-button есть/нет ровно там, где ожидается по `woAdd`

### Тикет 2 — Evaluations (список, деталь, live-статус через SSE, retry) [DONE]
**Файл**: `e2e/tests/evaluations.spec.js`
**Цель**: `EvaluationList` → клик по группе/итему → `EvaluationDetail` открывается;
если замокать бэкенд так, что `evaluate.status` меняется во времени (см. ниже) —
проверить, что `[data-testid="evaluate-status-card"]` меняет `data-status` БЕЗ
релоада страницы (это и есть SSE, `admin/src/libs/sse/sse.js` слушает
`/api/evaluate-events/:id`); отдельно — `error` статус показывает
`[data-testid="evaluate-error-card"]`, клик `[data-testid="evaluate-retry-button"]`
дергает `POST /api/evaluate-retry`.
**Как мокать SSE**: `EventSource` — обычный HTTP GET с `Content-Type: text/event-stream`,
Playwright может перехватить его через `page.route('**/api/evaluate-events/*', ...)`
и руками сформировать ответ вида `data: {...}\n\n` (см. `services/events.js` в бэкенде
для точного формата — `res.write('data: ' + JSON.stringify(data) + '\\n\\n')`).
Если это окажется неудобным через `route.fulfill` (стриминг) — альтернатива: не
мокать SSE вообще, а просто дважды дернуть `GET /api/evaluate-details` с разным
`evaluate.status` в ответе (через `route.fulfill` на первый и последующие запросы
по счётчику), и проверять только то, что видно после обычного релоада/повторного
фетча — это слабее, но тоже валидный тест, если SSE-мок не заведётся с первого раза.
**Acceptance**:
- список открывается, группировка по exam/module переключается (кнопки "по экзамену"/"по модулю", `GroupModeSwitch` в `EvaluationList.js`, без testid — либо добавить, либо селектить по тексту)
- деталь открывается по клику из списка
- `pending`/`processing` показывает `evaluate-status-card`, `done` — score, `error` — retry-кнопку и она реально шлёт запрос

### Тикет 3 — Mock-интервью, happy path (замоканный embed-контракт)
**Файл**: `e2e/tests/mock-interview.spec.js`
**Цель**: самый ценный тест недели — весь путь `MockInterview.js`/`MockInterviewIframe.js`
БЕЗ реального itk-live. Используй `e2e/helpers/mockInterviewFrame.js`.
**Сценарии (отдельные test() внутри файла)**:
1. Happy path: mock reserve success → embed-session success → iframe рендерится
   (`[data-testid="mock-interview-overlay"]` появляется) → шлём `itk.interview.session_closed`
   `{status:'completed'}` с `delayMs` побольше (проверить и саму задержку — см. `FINISH_DELAY_MS=5000`
   в `MockInterviewIframe.js`: оверлей должен закрыться примерно через 5с ПОСЛЕ события,
   не мгновенно — можно проверить через `expect(overlay).toBeVisible()` сразу после
   события и `expect(overlay).toBeHidden({timeout: 6000})` чуть позже)
2. Busy: `reserveFails: true` в моке → `[data-testid="mock-interview-start-error"]`
   показывает "занято другим пользователем" (сообщение см. `MockInterview.js` → `startAttempt`)
3. Heartbeat-фолбэк: шлём `itk.interview.error` с `payload.stage:'heartbeat'` и
   `payload.error` содержащим "invalid authorization" → должно сработать так же, как
   `session_closed completed` (с той же задержкой) — это ровно тот баг, который чинили
   на этой неделе (см. git log `MockInterviewIframe.js`), не потерять регрессией
4. Не-completed закрытие: `session_closed` с любым другим `status` → оверлей закрывается
   СРАЗУ, без задержки (проверить, что `FINISH_DELAY_MS` тут не применяется)
**Acceptance**: все 4 сценария зелёные, задержка в сценарии 1/3 реально измерена (не
просто "закрылось когда-нибудь"), в сценарии 2 текст ошибки виден.

### Тикет 4 — RunExam, простой квиз без код-задач [DONE]
**Файл**: `e2e/tests/run-exam.spec.js`
**Цель**: `quiz/:id` → `RunExam/RunExam.js`. Замокать `GET /api/load-exam` так, чтобы
`tasksDb` было пустым (нет код-задач → не нужен докер), а `quizQuestionsPlainPub` —
1-2 простых вопроса. Пройти вопрос, отправить (`/api/attempt-to-run` или submit-флоу —
свериться в `RunExam.js`, кнопка "Проверить результат"/"Завершить экзамен"), увидеть
результат/submitted-состояние (`SubmittedExamPreview.js`).
**Осторожно**: таймер (`CountDown` в `RunExam.js`) реально тикает и по истечении сам
сабмитит — либо мокать `exam.startCd`/`minutesStr` с большим запасом, либо не ждать
долго в тесте.
**Acceptance**: вопрос отвечен, экзамен переходит в submitted, `SubmittedExamPreview`
показывает то, что было отправлено.

### Тикет 5 (не для параллельного агента, справочно) — real-audio smoke
Не по этому плану — ручной/периодический прогон с реальным itk-live через
Chromium-флаги `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=...`
на 1-2 стабильных каталогах (`reference.graphics.raster-vector.v1` — уже проверен
рабочим). Не мокает ничего, гоняется отдельно и нечасто — см. обсуждение в этом чате
(флейковость внешнего сервиса), не гейт ни для чего.

---

## Уже сделано (эта сессия)
- Playwright-скаффолд: `e2e/package.json`, `playwright.config.js`, `helpers/{auth,table,mockInterviewFrame}.js`, `tests/login.spec.js` (реальный рабочий пример)
- testid на: Login, `libs/Table/*` (общий CRUD-движок), MockInterviewStartCard/Iframe, EvaluationDetail
