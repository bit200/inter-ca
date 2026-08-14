const { test, expect } = require('@playwright/test');
const http = require('http');

// Тикет 2 (E2E_TEST_PLAN.md) — EvaluationList / EvaluationDetail / SSE-статус / retry.
//
// --- Логин --------------------------------------------------------------------
// EvaluationList/EvaluationDetail требуют залогиненную сессию, но реальных креды
// (E2E_USERNAME/E2E_PASSWORD) в этом окружении нет. Вместо прогона формы логина
// (helpers/auth.js -> login()) сидим тот же localStorage-стейт, который проверяет
// сам фронт:
//   - admin/src/libs/user/user.js: get_token() читает localStorage.token, App.js
//     (<Root>, useEffect) редиректит на /login только когда его нет;
//   - тот же user.js безусловно дёргает on_refresh_token() вскоре после каждой
//     загрузки страницы (setTimeout внизу файла) — если localStorage.refresh_token
//     нет, on_refresh_token() синхронно вызывает user.logout(), а logout() в первые
//     2с после открытия страницы сразу редиректит на /login (см. pageOpenTime).
// Поэтому сидим token+refresh_token+user через page.addInitScript (выполняется до
// любого кода приложения, в т.ч. admin_env.js/user.js) перед каждым переходом, а
// сам background-запрос on_refresh_token мокаем, чтобы не улетал в нерабочий бэкенд.
async function seedAuth(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-fake-token');
    localStorage.setItem('refresh_token', 'e2e-fake-refresh-token');
    localStorage.setItem('user', JSON.stringify({
      _id: 'e2e-user', first_name: 'E2E', last_name: 'Tester', roles: ['super_admin'],
    }));
  });
  await page.route('**/api/auth/on_refresh_token/**', route => route.fulfill({
    json: { token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh-token', user: { _id: 'e2e-user' } },
  }));
}

// /evaluate-list отвечает {items, total, done} с тех пор, как список стал пагинированным
// (см. коммит "Fetch /evaluate-list paginated instead of the whole history at once") -
// EvaluationList.js деструктурирует именно эту форму, голый массив как ответ он не поймёт.
async function mockEvalList(page, items) {
  await page.route('**/api/evaluate-list*', route => route.fulfill({
    json: { items, total: items.length, done: items.filter(it => it.evaluate?.status === 'done').length },
  }));
}

// byId: quizHistoryId -> item (одна и та же деталь на каждый GET) либо массив
// item'ов (на N-ный GET по этому id отдаётся N-ный элемент массива, дальше — последний;
// нужно для теста retry, где второй фетч после ретрая должен отличаться от первого).
async function mockEvalDetails(page, byId) {
  const counts = {};
  await page.route('**/api/evaluate-details*', route => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('quizHistoryId');
    const entry = byId[id];
    if (!entry) {
      return route.fulfill({ status: 404, json: { error: 'not found' } });
    }
    if (Array.isArray(entry)) {
      const n = counts[id] || 0;
      counts[id] = n + 1;
      return route.fulfill({ json: entry[Math.min(n, entry.length - 1)] });
    }
    return route.fulfill({ json: entry });
  });
}

async function mockAdviceEmpty(page) {
  await page.route('**/api/eval-advice-rule*', route => route.fulfill({ json: { items: [] } }));
  await page.route('**/api/eval-metric-schemas*', route => route.fulfill({ json: { items: [] } }));
}

// --- SSE-мок --------------------------------------------------------------
// Ticket подсказывает два варианта: (a) руками собрать `data: {...}\n\n` через
// page.route(...).fulfill(...), (b) если это неудобно из-за стриминга — слабый
// фолбэк с двойным GET /evaluate-details по счётчику запросов (без реального SSE).
// Мы используем (a), но не через route.fulfill (у него один статический body,
// разнести кадры по времени им нельзя — это ровно та проблема, о которой
// предупреждает тикет), а через настоящий Node-HTTP-сервер, который сам
// стримит `data: ...\n\n` с задержками (тот же формат, что и бэкенд —
// services/events.js в itk-platform-en/interviews/api), и `route.continue({url})`,
// который на уровне перехвата запроса подменяет реальный адрес запроса EventSource
// на этот локальный сервер. Со стороны страницы это неотличимо от настоящего SSE:
// EventSource получает реальный, растянутый во времени поток чанков.
function startSseServer(frames) {
  return new Promise((resolve) => {
    const sockets = new Set();
    const server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        // route.continue({url}) actually redirects the physical request to this
        // server (127.0.0.1:<port>), which the browser treats as a different origin
        // than the page (localhost:3000) — EventSource enforces CORS on that real
        // destination, so without this header Chromium blocks the response outright.
        'Access-Control-Allow-Origin': '*',
      });
      res.flushHeaders();
      const timers = frames.map(({ delayMs, data }) => setTimeout(() => {
        try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) { /* клиент уже отвалился */ }
      }, delayMs));
      req.on('close', () => timers.forEach(clearTimeout));
    });
    server.on('connection', socket => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    server.listen(0, '127.0.0.1', () => resolve({
      close: () => new Promise(r => {
        sockets.forEach(s => s.destroy());
        server.close(() => r());
      }),
      port: server.address().port,
    }));
  });
}

async function routeSseTo(page, port) {
  await page.route('**/api/evaluate-events/**', route => route.continue({ url: `http://127.0.0.1:${port}/` }));
}

test.describe('Evaluations', () => {
  test('список открывается, группировка по exam/module переключается', async ({ page }) => {
    await seedAuth(page);
    await mockEvalList(page, [
      { _id: 'ev-exam-1', exam: 501, question: 1, titleInfo: { title: 'Что такое замыкание?' }, evaluate: { status: 'pending' } },
      { _id: 'ev-mod-1', question: 2, titleInfo: { title: 'Опишите цикл событий', moduleInfo: { name: 'JS Basics' } }, evaluate: { status: 'done', result: { score: 8 } } },
    ]);

    await page.goto('/evaluations');

    // groupMode по умолчанию — 'exam': видна только группа item'а с exam-полем
    const headers = page.locator('[data-testid="evaluation-group-header"]');
    await expect(headers).toHaveCount(1);
    await expect(headers.first()).toHaveAttribute('data-group-label', 'Экзамен #501');

    await page.locator('[data-testid="evaluation-group-mode-module"]').click();

    await expect(headers).toHaveCount(1);
    await expect(headers.first()).toHaveAttribute('data-group-label', 'JS Basics');

    await page.locator('[data-testid="evaluation-group-mode-exam"]').click();
    await expect(headers).toHaveCount(1);
    await expect(headers.first()).toHaveAttribute('data-group-label', 'Экзамен #501');
  });

  test('деталь открывается по клику из списка', async ({ page }) => {
    await seedAuth(page);
    await mockEvalList(page, [
      { _id: 'ev-exam-1', exam: 501, question: 1, titleInfo: { title: 'Что такое замыкание?' }, evaluate: { status: 'pending' } },
    ]);
    await mockEvalDetails(page, {
      'ev-exam-1': { _id: 'ev-exam-1', question: 1, titleInfo: { title: 'Что такое замыкание?' }, evaluate: { status: 'pending' }, cd: Date.now() },
    });
    await mockAdviceEmpty(page);

    await page.goto('/evaluations');

    // группа свёрнута по умолчанию — кликаем по стрелке-иконке в хедере (не по
    // самому лейблу: тот — <Link to="/quiz/:examId">, клик по нему увёл бы на
    // немокнутый роут)
    await page.locator('[data-testid="evaluation-group-header"] i').click();
    await page.locator('[data-testid="evaluation-group-item"][data-item-id="ev-exam-1"]').click();

    await expect(page).toHaveURL(/\/evaluations\/ev-exam-1$/);
    await expect(page.getByText('Что такое замыкание?')).toBeVisible();
    await expect(page.locator('[data-testid="evaluate-status-card"]')).toHaveAttribute('data-status', 'pending');
  });

  test('pending/processing показывает evaluate-status-card', async ({ page }) => {
    await seedAuth(page);
    await mockAdviceEmpty(page);
    await mockEvalDetails(page, {
      'ev-proc-1': { _id: 'ev-proc-1', question: 1, titleInfo: { title: 'Вопрос' }, evaluate: { status: 'processing' } },
    });

    await page.goto('/evaluations/ev-proc-1');

    const card = page.locator('[data-testid="evaluate-status-card"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-status', 'processing');
  });

  test('done показывает score', async ({ page }) => {
    await seedAuth(page);
    await mockAdviceEmpty(page);
    await mockEvalDetails(page, {
      'ev-done-1': { _id: 'ev-done-1', question: 1, titleInfo: { title: 'Вопрос' }, evaluate: { status: 'done', result: { score: 8, text: 'Ответ кандидата' } } },
    });

    await page.goto('/evaluations/ev-done-1');

    await expect(page.locator('[data-testid="evaluate-status-card"]')).toHaveCount(0);
    const score = page.locator('[data-testid="evaluate-score"]');
    await expect(score).toBeVisible();
    await expect(score).toHaveAttribute('data-score', '8');
  });

  test('done показывает "Детали оценки" с прогресс-барами по параметрам рядом с общим баллом', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/eval-advice-rule*', route => route.fulfill({
      json: { items: [
        { key: 'evaluation.speech.score', from: 0, to: 10, advice: 'ok' },
        { key: 'evaluation.practice.avg_how', from: 0, to: 1, advice: 'unused' },
      ] },
    }));
    await page.route('**/api/eval-metric-schemas*', route => route.fulfill({
      json: { items: [
        { key: 'evaluation.speech.score', group: 'Речь' },
        { key: 'evaluation.practice.avg_how', group: 'Практика' },
      ] },
    }));
    await mockEvalDetails(page, {
      'ev-metrics-1': {
        _id: 'ev-metrics-1', question: 1, titleInfo: { title: 'Вопрос' },
        evaluate: { status: 'done', result: {
          score: 8, text: 'Ответ кандидата',
          // avg_how=5 is outside the advice rule's [0,1] range, so this row still
          // gets a percent bar (clamped to 100%) but NO matching advice - used below
          // to exercise the "no advice -> non-interactive row" cursor/no-modal behavior.
          evaluation: { speech: { score: 8 }, practice: { avg_how: 5, count: 1 } },
        } },
      },
    });

    await page.goto('/evaluations/ev-metrics-1');

    // Прогресс-бары и рекомендации теперь в одной секции "Детали оценки" -
    // отдельной карточки metric-breakdown над ней больше нет.
    await expect(page.getByText('Детали оценки')).toBeVisible();

    const rows = page.locator('[data-testid="metric-breakdown-row"]');
    await expect(rows).toHaveCount(2);

    const speechRow = rows.filter({ hasText: 'Речь' });
    const practiceRow = rows.filter({ hasText: 'Практика' });
    await expect(speechRow).toHaveAttribute('data-pct', '80');

    // Речь: значение 8 попадает в диапазон [0,10] правила -> есть рекомендация,
    // строка кликабельна (курсор-указатель) и открывает модалку с этой рекомендацией.
    await expect(speechRow).toHaveAttribute('data-clickable', 'true');
    await expect(speechRow).toHaveCSS('cursor', 'pointer');
    // Подсказка "тут есть совет" - без неё непонятно, что строка кликабельна.
    await expect(speechRow.locator('[data-testid="metric-breakdown-row-hint"]')).toBeVisible();
    await speechRow.click();
    const modal = page.locator('[data-testid="metric-breakdown-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('ok');
    await expect(modal).not.toContainText('unused');

    // Закрываем модалку, чтобы дальше проверить строку без рекомендаций.
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);

    // Практика: значение 5 вне диапазона [0,1] правила -> рекомендаций нет,
    // строка НЕ кликабельна - обычный курсор, клик не открывает модалку.
    await expect(practiceRow).toHaveAttribute('data-clickable', 'false');
    await expect(practiceRow).toHaveCSS('cursor', 'default');
    // Нет рекомендации - нет и подсказки-иконки, незачем звать её нажать.
    await expect(practiceRow.locator('[data-testid="metric-breakdown-row-hint"]')).toHaveCount(0);
    await practiceRow.click();
    await expect(page.locator('[data-testid="metric-breakdown-modal"]')).toHaveCount(0);
  });

  test('группа "Ошибки" инвертирована: 0 ошибок -> 100%, не 0%', async ({ page }) => {
    await seedAuth(page);
    await page.route('**/api/eval-advice-rule*', route => route.fulfill({
      // count=0 (лучший случай, ошибок нет) попадает в диапазон [0,10] - строка
      // остаётся кликабельной, просто с "хорошей" рекомендацией/сообщением.
      json: { items: [{ key: 'evaluation.errors.count', from: 0, to: 10, advice: 'ошибок не найдено' }] },
    }));
    await page.route('**/api/eval-metric-schemas*', route => route.fulfill({
      json: { items: [{ key: 'evaluation.errors.count', group: 'Ошибки' }] },
    }));
    await mockEvalDetails(page, {
      'ev-errors-1': {
        _id: 'ev-errors-1', question: 1, titleInfo: { title: 'Вопрос' },
        evaluate: { status: 'done', result: {
          score: 9, text: 'Ответ кандидата',
          evaluation: { errors: { count: 0 } },
        } },
      },
    });

    await page.goto('/evaluations/ev-errors-1');

    // Сырое значение 0 нормализуется в 0% от диапазона правила - без инверсии это
    // выглядело бы как красный, почти пустой бар для ЛУЧШЕГО возможного случая
    // (ошибок нет). После инверсии для группы "Ошибки" 0 ошибок -> 100%, зелёный.
    const errorsRow = page.locator('[data-testid="metric-breakdown-row"]').filter({ hasText: 'Ошибки' });
    await expect(errorsRow).toHaveAttribute('data-pct', '100');
    await expect(errorsRow.locator('[class*="metricRowBar"] > div')).toHaveCSS('background-color', 'rgb(28, 190, 28)');
  });

  test('error показывает evaluate-error-card, retry реально шлёт POST /api/evaluate-retry', async ({ page }) => {
    await seedAuth(page);
    await mockAdviceEmpty(page);
    // первый GET (при монтировании) -> error; второй GET (после retry -> loadItem())
    // -> processing, чтобы убедиться, что retry реально переоткрыл данные
    await mockEvalDetails(page, {
      'ev-err-1': [
        { _id: 'ev-err-1', question: 1, titleInfo: { title: 'Вопрос' }, evaluate: { status: 'error', error: 'LLM timeout' } },
        { _id: 'ev-err-1', question: 1, titleInfo: { title: 'Вопрос' }, evaluate: { status: 'processing' } },
      ],
    });

    let retryBody = null;
    let retryCalls = 0;
    await page.route('**/api/evaluate-retry', route => {
      retryCalls += 1;
      retryBody = route.request().postDataJSON();
      return route.fulfill({ json: { ok: true } });
    });

    await page.goto('/evaluations/ev-err-1');

    const errorCard = page.locator('[data-testid="evaluate-error-card"]');
    await expect(errorCard).toBeVisible();
    await expect(errorCard).toContainText('LLM timeout');

    await page.locator('[data-testid="evaluate-retry-button"]').click();

    await expect.poll(() => retryCalls).toBe(1);
    expect(retryBody).toEqual({ quizHistoryId: 'ev-err-1' });

    // retry() дергает loadItem() -> второй мокнутый ответ (processing)
    await expect(page.locator('[data-testid="evaluate-status-card"]')).toHaveAttribute('data-status', 'processing');
    await expect(errorCard).toHaveCount(0);
  });

  test('SSE: evaluate-status-card меняет data-status без релоада страницы', async ({ page }) => {
    await seedAuth(page);
    await mockAdviceEmpty(page);
    await mockEvalDetails(page, {
      'ev-sse-1': { _id: 'ev-sse-1', question: 1, titleInfo: { title: 'Вопрос' }, evaluate: { status: 'pending' } },
    });

    // Оба delayMs отсчитываются от момента коннекта EventSource (независимо друг
    // от друга, не по накоплению) — см. startSseServer(). Изначально было 250/900,
    // но это гонка с самой загрузкой страницы: initial fetch (loadItem) + первый
    // рендер тяжёлого CRA-бандла в незакэшированном dev-режиме сам по себе иногда
    // занимает больше 250мс, из-за чего 'processing' успевал прийти раньше, чем
    // тест вообще успевал понаблюдать 'pending'. EvaluationDetail.js защищён от
    // потери данных (`setItem(prev => prev && {...})` — апдейт до первого fetch
    // молча дропается), так что это не баг приложения, а слишком тесный тайминг
    // именно в тесте. Даём щедрый запас — это не ослабляет проверку (мы всё ещё
    // ловим оба промежуточных состояния и доказываем отсутствие reload), просто
    // не гонимся с производительностью dev-сборки.
    const sse = await startSseServer([
      { delayMs: 1500, data: { status: 'processing' } },
      { delayMs: 3000, data: { status: 'done', result: { score: 9 } } },
    ]);
    await routeSseTo(page, sse.port);

    let navigations = 0;
    page.on('framenavigated', () => { navigations += 1; });

    try {
      await page.goto('/evaluations/ev-sse-1');
      await expect(page.locator('[data-testid="evaluate-status-card"]')).toHaveAttribute('data-status', 'pending');

      // отсюда и дальше — ни одной навигации/релоада быть не должно: и счётчик
      // framenavigated, и window-маркер (reload стирает JS-realm целиком) должны
      // остаться нетронутыми к моменту, когда статус дойдёт до 'done'
      navigations = 0;
      await page.evaluate(() => { window.__e2eNoReloadMarker = Date.now(); });
      const marker = await page.evaluate(() => window.__e2eNoReloadMarker);
      const urlBefore = page.url();

      await expect(page.locator('[data-testid="evaluate-status-card"]'))
        .toHaveAttribute('data-status', 'processing', { timeout: 5000 });

      const score = page.locator('[data-testid="evaluate-score"]');
      await expect(score).toBeVisible({ timeout: 5000 });
      await expect(score).toHaveAttribute('data-score', '9');
      await expect(page.locator('[data-testid="evaluate-status-card"]')).toHaveCount(0);

      expect(page.url()).toBe(urlBefore);
      expect(navigations).toBe(0);
      expect(await page.evaluate(() => window.__e2eNoReloadMarker)).toBe(marker);
    } finally {
      await sse.close();
    }
  });
});
