const { test, expect } = require('@playwright/test');
const { mockInterviewBackend } = require('../helpers/mockInterviewFrame');

// Тикет 3 (E2E_TEST_PLAN.md) — весь путь MockInterview.js/MockInterviewIframe.js
// без реального itk-live. См. helpers/mockInterviewFrame.js для контракта событий.
//
// Логин: в этом окружении нет тестовых кредов (E2E_USERNAME/E2E_PASSWORD не
// гарантированы), а флоу и так не завязан на конкретного пользователя — поэтому
// вместо реального login() сидим auth-состояние напрямую через localStorage,
// как его читает admin/src/libs/user/user.js (get_token()/get_info()).
//
// Важный нюанс (см. user.js): при загрузке модуля user.js unconditionally (через
// setTimeout(0)) вызывается user.on_refresh_token(), который:
//   - если нет localStorage.refresh_token — сразу делает user.logout() и уводит
//     на /login ДО того как отрендерится MockInterview — поэтому обязательно сидим
//     и refresh_token, не только token;
//   - если refresh_token есть — дергает GET /api/auth/on_refresh_token/:token;
//     ответ 401 из http.js тоже триггерит user.logout() → редирект на /login.
// Поэтому мокаем этот эндпоинт по любому телу с кодом 200, чтобы не улететь с
// /mock-interviews/:id раньше, чем успеет сработать авто-старт интервью.

const AUTH_USER = { _id: 'e2e-user', roles: ['user'], first_name: 'E2E', last_name: 'Test' };

async function seedAuth(page) {
  await page.addInitScript(
    ({ user }) => {
      window.localStorage.setItem('token', 'e2e-fake-token');
      window.localStorage.setItem('refresh_token', 'e2e-fake-refresh-token');
      window.localStorage.setItem('user', JSON.stringify(user));

      // Инструментация для теста (не часть приложения): параллельно с обработчиком
      // в MockInterviewIframe.js слушаем те же postMessage от фейкового embed-iframe
      // и запоминаем время получения — так можно измерить реальную задержку между
      // событием и закрытием оверлея, а не просто дождаться "когда-нибудь закрылось".
      window.__e2eEvents = [];
      window.addEventListener('message', (e) => {
        let msg;
        try {
          msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        } catch (_) {
          return;
        }
        if (msg && msg.source === 'itk-live-embed') {
          window.__e2eEvents.push({ type: msg.type, at: Date.now() });
        }
      });
    },
    { user: AUTH_USER }
  );

  await page.route('**/api/auth/on_refresh_token/**', (route) =>
    route.fulfill({
      json: { token: 'e2e-fake-token', refresh_token: 'e2e-fake-refresh-token', user: AUTH_USER },
    })
  );
}

function makeMockItem(overrides = {}) {
  return {
    _id: 'e2e-mock-interview-1',
    interviewId: 'itk-interview-e2e',
    status: 'active',
    mode: 'live',
    name: 'E2E Mock Interview',
    ...overrides,
  };
}

// Ждём, пока инструментированный слушатель (см. seedAuth) зафиксирует событие
// нужного типа, и возвращает время получения (Node Date.now(), сразу после того
// как это подтвердил браузер) — точка отсчёта для измерения задержки закрытия.
async function waitForEmbedEvent(page, type) {
  await page.waitForFunction(
    (t) => (window.__e2eEvents || []).some((e) => e.type === t),
    type,
    { timeout: 5_000 }
  );
  return Date.now();
}

test.describe('Mock-интервью — happy path и фолбэки (замоканный embed-контракт)', () => {
  test('1. happy path: reserve → embed-session → оверлей → session_closed{completed} закрывается ПОСЛЕ задержки ~FINISH_DELAY_MS', async ({ page }) => {
    const mockItem = makeMockItem();
    await seedAuth(page);
    await mockInterviewBackend(page, {
      mockItem,
      events: [
        { delayMs: 300, type: 'itk.interview.session_closed', payload: { status: 'completed' } },
      ],
    });

    await page.goto(`/mock-interviews/${mockItem._id}`);

    const overlay = page.locator('[data-testid="mock-interview-overlay"]');
    // auto-start на mount (MockInterview.js) должен сам зарезервировать интервью,
    // получить embed-session и отрендерить iframe — без клика по start-кнопке.
    // Таймаут увеличен относительно дефолтных 5с — это цепочка из нескольких
    // моканных async-запросов + рендер, под нагрузкой (параллельные воркеры) может
    // не уложиться в дефолт, при этом сама эта проверка не участвует в измерении
    // FINISH_DELAY_MS ниже.
    await expect(overlay).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="mock-interview-embed-frame"]')).toBeVisible();

    const eventAt = await waitForEmbedEvent(page, 'itk.interview.session_closed');

    // сразу после события оверлей ещё должен быть на месте — закрытие НЕ мгновенное
    await expect(overlay).toBeVisible();

    await expect(overlay).toBeHidden({ timeout: 6_000 });
    const elapsedMs = Date.now() - eventAt;

    // FINISH_DELAY_MS = 5000 в MockInterviewIframe.js — измеряем реальную задержку,
    // а не просто факт закрытия. Нижняя граница с запасом на измерительный оверхед,
    // но достаточно высокая, чтобы поймать регрессию "закрылось мгновенно".
    expect(elapsedMs).toBeGreaterThan(3_500);
  });

  test('2. busy: reserve возвращает 409 → показывается ошибка "занято другим пользователем"', async ({ page }) => {
    const mockItem = makeMockItem();
    await seedAuth(page);
    await mockInterviewBackend(page, {
      mockItem,
      events: [],
      reserveFails: true,
    });

    await page.goto(`/mock-interviews/${mockItem._id}`);

    const startError = page.locator('[data-testid="mock-interview-start-error"]');
    await expect(startError).toBeVisible({ timeout: 10_000 });
    await expect(startError).toContainText('занято другим пользователем');

    // оверлей интервью при этом не должен появиться вообще
    await expect(page.locator('[data-testid="mock-interview-overlay"]')).toBeHidden();
  });

  test('3. heartbeat-фолбэк: itk.interview.error{stage:heartbeat, invalid authorization} закрывается как completed, с той же задержкой', async ({ page }) => {
    const mockItem = makeMockItem();
    await seedAuth(page);
    await mockInterviewBackend(page, {
      mockItem,
      events: [
        {
          delayMs: 300,
          type: 'itk.interview.error',
          payload: { stage: 'heartbeat', error: 'invalid authorization: token expired' },
        },
      ],
    });

    await page.goto(`/mock-interviews/${mockItem._id}`);

    const overlay = page.locator('[data-testid="mock-interview-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    const eventAt = await waitForEmbedEvent(page, 'itk.interview.error');

    // regression guard: баг, который чинили на этой неделе — эта ошибка НЕ должна
    // закрывать оверлей мгновенно (закрытие должно идти через тот же completeWithDelay,
    // что и обычный session_closed{completed})
    await expect(overlay).toBeVisible();

    await expect(overlay).toBeHidden({ timeout: 6_000 });
    const elapsedMs = Date.now() - eventAt;

    expect(elapsedMs).toBeGreaterThan(3_500);
  });

  test('4. session_closed с не-completed статусом закрывает оверлей СРАЗУ, без FINISH_DELAY_MS', async ({ page }) => {
    const mockItem = makeMockItem();
    await seedAuth(page);
    await mockInterviewBackend(page, {
      mockItem,
      // delayMs побольше (не 300, как в сценариях 1/3) специально: тут закрытие
      // не отложено (в отличие от completed-ветки), поэтому оверлей после этого
      // события живёт considerably доли секунды — если событие прилетит слишком
      // рано (пока страница ещё грузится/маунтится), можно вообще не успеть
      // застать оверлей видимым до того, как он тут же скроется, и словить
      // ложный failure "оверлей не появился" вместо проверки задержки.
      events: [
        { delayMs: 1_500, type: 'itk.interview.session_closed', payload: { status: 'cancelled' } },
      ],
    });

    await page.goto(`/mock-interviews/${mockItem._id}`);

    const overlay = page.locator('[data-testid="mock-interview-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    const eventAt = await waitForEmbedEvent(page, 'itk.interview.session_closed');

    // Короткий timeout — если бы FINISH_DELAY_MS случайно применился и тут, оверлей
    // не успел бы скрыться за 1500мс и этот expect сам провалился бы по таймауту.
    await expect(overlay).toBeHidden({ timeout: 1_500 });
    const elapsedMs = Date.now() - eventAt;

    expect(elapsedMs).toBeLessThan(1_500);
  });
});
