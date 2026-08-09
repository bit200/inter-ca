// Тикет 1 — CRUD-разделы (suggestions/requests/interviews/quiz/mock-interviews).
// См. E2E_TEST_PLAN.md.
//
// === Как замокан логин (и почему) ===
// E2E_USERNAME/E2E_PASSWORD не заданы в этом окружении и реальных кредов нет, поэтому
// реальный логин через форму невозможен. Вместо этого сеем именно то состояние, которое
// admin/src/libs/user/user.js считает "залогинен" — localStorage.token (+ refresh_token,
// + user) — через page.addInitScript ДО первой навигации. user.get_token() читает
// исключительно localStorage, App.js->Root() редиректит на /login только если токена нет
// (см. useEffect в Root()), так что этого достаточно, реальный /api/auth/login не нужен.
//
// === Как замокан бэкенд (и почему так) ===
// window.env.domain на localhost — это НЕ baseURL Плейврайта (localhost:3000), а
// http://localhost:6057 (см. admin/src/admin_env.js: is_local => local = 'http://' +
// hostname + ':6057'). Это отдельный порт => кросс-origin запросы. Бэкенд на 6057 не
// поднят вообще (проверено: connection refused), поэтому мокаем ВСЕ запросы к 6057 через
// один page.route('**/*', ...) с ручным роутингом по URL внутри — так проще, чем несколько
// пересекающихся page.route с непонятным приоритетом, когда паттерны могут перекрываться
// (общий /api/** и конкретные /api/my-suggestion и т.п.). На каждый непойманный конкретной
// фикстурой запрос (courses-виджеты /main, on_refresh_token, который user.js дёргает при
// каждой загрузке приложения, и т.п.) отвечаем безопасной пустой заглушкой, чтобы приложение
// не падало — например /main (дашборд, CoursesList.js) ожидает конкретную форму ответа
// (userCourses.reduce(...) и т.п.) и падает в PAGEERROR на пустом {items:[],total:0}. Поэтому
// тесты НЕ заходят на /main — стартуем сразу на одном из 5 целевых разделов (goto), а
// переходы МЕЖДУ разделами проверяем кликом по пунктам меню в сайдбаре (см. ниже) — это и
// есть проверка "урл матчится" из тикета, просто без обязательного самого первого захода
// именно через меню (первого захода через меню и не может быть — сразу после логина
// реальное приложение просто редиректит на /main, куда мы намеренно не идём).
//
// Обычные Chromium GET/POST с кастомным Authorization+Content-Type к другому порту в
// теории должны провоцировать CORS preflight (OPTIONS) — на практике при интерцепции через
// page.route этого не происходит (проверено), но на всякий случай OPTIONS всё равно
// обрабатывается ниже с нужными Access-Control-* заголовками.
//
// === Меню и урлы ===
// global.CONFIG.header в App.js хранит { name, url } с URL БЕЗ /api-префикса — это
// собственно путь страницы (Link to={it.url} в comps/Header/Header1.js, рендерится в
// сайдбаре, класс .startbar-menu). global.CONFIG.urls[key].url — это отдельное поле,
// endpoint для Table (http.get(opts.url, ...)), НЕ путь страницы. Значения совпадают
// с ключами: /suggestions, /requests, /interviews, /quiz, /mock-interviews — путь
// страницы; /my-suggestion, /my-client-req, /my-interview, /my-exam,
// /mock-interview/my-list — API-эндпоинты, которые мы мокаем ниже.
//
// === ВАЖНОЕ РАСХОЖДЕНИЕ С ТЕКСТОМ ТИКЕТА ===
// Тикет утверждает "suggestions (/my-suggestion, кнопка добавить есть)". Это не так:
// в App.js (admin/src/App.js) suggestions имеет `woAdd: true` (как и quiz/mock-interviews),
// т.е. кнопки "+Добавить" там СЕЙЧАС НЕТ. У requests woAdd закомментирован — вот там кнопка
// действительно есть. Тест ниже проверяет фактическое поведение (кнопки у suggestions нет),
// не то, что написано в тикете — см. отдельный комментарий в тесте suggestions.
//
// === Известный баг движка, который тут обходим, а не чиним ===
// TableFilter1.js (libs/Table/TableFilter1.js — общий файл, вне периметра этого тикета)
// строит data-testid фильтра как `table-filter-${filterKey}-${item.value}`. Для
// mock-interviews два фильтра используют объект-значение ({$in: [...]}) — интерполяция
// объекта в шаблонную строку даёт "[object Object]" ОБА раза, то есть у "Ожидают" и
// "Закончились" получается ОДИН И ТОТ ЖЕ data-testid ("table-filter-status-[object Object]"),
// подтверждено вручную в браузере. Обычный table.clickFilter() тут упадёт с Playwright
// strict-mode violation (совпадение с 2 элементами). Раз трогать TableFilter1.js нельзя
// (общий файл, над ним параллельно работают по другим тикетам), кликаем по позиции внутри
// группы фильтров — см. clickMockInterviewAmbiguousFilter ниже, с комментарием на месте.

const { test, expect } = require('@playwright/test');
const table = require('../helpers/table');

// ---- Фикстуры (по несколько строк, разные статусы — чтобы фильтры/поиск были
// содержательными) ----

const FIXTURES = {
  '/api/my-suggestion': [
    { _id: 'sg1', name: 'Suggestion Alpha question', status: 'edit' },
    { _id: 'sg2', name: 'Suggestion Beta question', status: 'sent' },
    { _id: 'sg3', name: 'Suggestion Gamma question', status: 'approved' },
    { _id: 'sg4', name: 'Suggestion Delta question', status: 'canceled' },
  ],
  '/api/my-client-req': [
    { _id: 'r1', name: 'Request Alpha', status: 'open', type: 'norm' },
    { _id: 'r2', name: 'Request Beta', status: 'answered', type: 'urgent' },
    { _id: 'r3', name: 'Request Gamma', status: 'closed', type: 'norm' },
  ],
  '/api/my-interview': [
    { _id: 'i1', name: 'Interview Alpha', status: 'waiting', client: 'ClientA', type: 'HR' },
    { _id: 'i2', name: 'Interview Beta', status: 'offer', client: 'ClientB', type: 'tech' },
    { _id: 'i3', name: 'Interview Gamma', status: 'next_stage', client: 'ClientC', type: 'tech' },
    { _id: 'i4', name: 'Interview Delta', status: 'bad', client: 'ClientD', type: 'HR' },
  ],
  '/api/my-exam': [
    { _id: 'q1', name: 'Exam Alpha', status: 'waiting' },
    { _id: 'q2', name: 'Exam Beta', status: 'started' },
    { _id: 'q3', name: 'Exam Gamma', status: 'submitted' },
  ],
  '/api/mock-interview/my-list': [
    { _id: 'm1', name: 'Mock Draft one', status: 'draft', mode: 'tech' },
    { _id: 'm2', name: 'Mock Active one', status: 'active', mode: 'tech' },
    { _id: 'm3', name: 'Mock Started one', status: 'started', mode: 'tech' },
    { _id: 'm4', name: 'Mock Completed one', status: 'completed', mode: 'tech' },
    { _id: 'm5', name: 'Mock Evaluated one', status: 'evaluated', mode: 'tech' },
  ],
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

// GET-запросы в этом приложении сериализуют вложенные объекты в query bracket-нотацией
// (см. admin/src/libs/http/http.js: serialize()), напр. filter[status]=sent или
// filter[status][$in][0]=draft&filter[status][$in][1]=active. Разбираем это обратно в
// обычный объект, чтобы мок мог фильтровать фикстуру так же, как это делал бы реальный
// бэкенд.
function parseNestedQuery(urlStr) {
  const u = new URL(urlStr);
  const result = {};
  for (const [key, value] of u.searchParams) {
    const parts = key.split(/\[|\]/).filter((p) => p !== '');
    let obj = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        obj[part] = value;
      } else {
        const nextPart = parts[i + 1];
        const isArrayIndex = /^\d+$/.test(nextPart);
        if (!(part in obj)) obj[part] = isArrayIndex ? [] : {};
        obj = obj[part];
      }
    }
  }
  return result;
}

function filterRows(rows, query) {
  let out = rows;
  if (query.search) {
    const re = new RegExp(query.search, 'i');
    out = out.filter((r) => re.test(r.name || ''));
  }
  if (query.filter && query.filter.status !== undefined) {
    const statusFilter = query.filter.status;
    if (statusFilter && typeof statusFilter === 'object' && statusFilter['$in']) {
      const inArr = Array.isArray(statusFilter['$in']) ? statusFilter['$in'] : Object.values(statusFilter['$in']);
      out = out.filter((r) => inArr.includes(r.status));
    } else {
      out = out.filter((r) => r.status === statusFilter);
    }
  }
  return out;
}

async function mockBackend(page) {
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();

    if (!url.includes(':6057')) {
      await route.continue();
      return;
    }

    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
      return;
    }

    const matchKey = Object.keys(FIXTURES).find((k) => url.includes(k));
    if (matchKey) {
      const query = parseNestedQuery(url);
      const filtered = filterRows(FIXTURES[matchKey], query);
      await route.fulfill({
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: filtered, total: filtered.length }),
      });
      return;
    }

    // Всё остальное (on_refresh_token при загрузке приложения и любые прочие вызовы) —
    // безопасная пустая заглушка. token/refresh_token/user — на случай если это ответ
    // именно на on_refresh_token (user.js->handle_login_response ждёт эти поля).
    await route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [],
        total: 0,
        token: 'fake-token',
        refresh_token: 'fake-refresh-token',
        user: { _id: 1, first_name: 'E2E', last_name: 'Tester', roles: ['admin'] },
      }),
    });
  });
}

async function seedAuth(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'fake-token');
    window.localStorage.setItem('refresh_token', 'fake-refresh-token');
    window.localStorage.setItem(
      'user',
      JSON.stringify({ _id: 1, first_name: 'E2E', last_name: 'Tester', roles: ['admin'] })
    );
  });
}

// Клик по пункту меню в сайдбаре по точному href — см. comps/Header/Header1.js,
// Link to={it.url} рендерится внутри .startbar-menu.
async function clickHeaderMenu(page, href) {
  await page.locator(`.startbar-menu a[href="${href}"]`).click();
}

// Обход дублирующихся data-testid у "Ожидают"/"Закончились" в mock-interviews —
// см. большой комментарий вверху файла. index — позиция среди всех кнопок фильтра
// status (0 = "Все", 1 = "Ожидают", 2 = "Начались" (уникальный testid, можно было бы
// использовать table.clickFilter, но для единообразия с соседним кликаем так же), 3 =
// "Закончились").
async function clickMockInterviewFilterByPosition(page, index) {
  await page.locator('[data-testid^="table-filter-status-"]').nth(index).click();
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
  await seedAuth(page);
});

test('навигация: клик по пунктам меню открывает все 5 CRUD-разделов, урлы совпадают', async ({ page }) => {
  // Первый заход — напрямую на suggestions (goto). Дальше — только кликами по меню.
  // Почему не стартуем с /main как после реального логина — см. комментарий вверху файла
  // (дашборд падает на наших пустых моках, это не связано с разделами из этого тикета).
  await page.goto('/suggestions');
  await expect(page).toHaveURL(/\/suggestions/);

  await clickHeaderMenu(page, '/requests');
  await expect(page).toHaveURL(/\/requests/);

  await clickHeaderMenu(page, '/interviews');
  await expect(page).toHaveURL(/\/interviews/);

  await clickHeaderMenu(page, '/quiz');
  await expect(page).toHaveURL(/\/quiz/);

  await clickHeaderMenu(page, '/mock-interviews');
  await expect(page).toHaveURL(/\/mock-interviews/);

  await clickHeaderMenu(page, '/suggestions');
  await expect(page).toHaveURL(/\/suggestions/);
});

test('suggestions: таблица, поиск, фильтр по статусу; add-button отсутствует', async ({ page }) => {
  await page.goto('/suggestions');

  await expect(table.rows(page)).toHaveCount(4);

  // РАСХОЖДЕНИЕ С ТИКЕТОМ: в тексте тикета "suggestions ... кнопка добавить есть", но
  // в App.js у suggestions стоит woAdd: true — кнопки нет. Проверяем то, что реально
  // происходит в приложении.
  await expect(page.locator('[data-testid="table-add-button"]')).toHaveCount(0);

  // фильтр по статусу реально меняет набор строк
  await table.clickFilter(page, 'status', 'sent');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Suggestion Beta question');

  await table.clickFilter(page, 'status'); // "Все"
  await expect(table.rows(page)).toHaveCount(4);

  // поиск сужает выдачу
  await table.search(page, 'Gamma');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Suggestion Gamma question');
});

test('requests: таблица, поиск, фильтр по статусу, add-button открывает форму', async ({ page }) => {
  await page.goto('/requests');

  await expect(table.rows(page)).toHaveCount(3);
  await expect(page.locator('[data-testid="table-add-button"]')).toHaveCount(1);

  await table.clickFilter(page, 'status', 'answered');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Request Beta');

  await table.clickFilter(page, 'status');
  await expect(table.rows(page)).toHaveCount(3);

  await table.search(page, 'Gamma');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Request Gamma');

  await table.search(page, ''); // сброс перед добавлением, чтобы не путать состояние
  await table.clickAdd(page);
  await expect(page.locator('.ReactModal__Content')).toBeVisible();
});

test('interviews: таблица, поиск, фильтр по статусу, add-button открывает форму', async ({ page }) => {
  await page.goto('/interviews');

  await expect(table.rows(page)).toHaveCount(4);
  await expect(page.locator('[data-testid="table-add-button"]')).toHaveCount(1);

  await table.clickFilter(page, 'status', 'waiting');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Interview Alpha');

  await table.clickFilter(page, 'status');
  await expect(table.rows(page)).toHaveCount(4);

  await table.search(page, 'Gamma');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Interview Gamma');

  await table.search(page, '');
  await table.clickAdd(page);
  await expect(page.locator('.ReactModal__Content')).toBeVisible();
});

test('quiz: таблица, поиск, три статус-фильтра, add-button отсутствует (woAdd:true)', async ({ page }) => {
  await page.goto('/quiz');

  await expect(table.rows(page)).toHaveCount(3);
  await expect(page.locator('[data-testid="table-add-button"]')).toHaveCount(0);

  await table.clickFilter(page, 'status', 'waiting');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Exam Alpha');

  await table.clickFilter(page, 'status', 'started');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Exam Beta');

  await table.clickFilter(page, 'status', 'submitted');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Exam Gamma');

  await table.clickFilter(page, 'status');
  await expect(table.rows(page)).toHaveCount(3);

  await table.search(page, 'Gamma');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Exam Gamma');
});

test('mock-interviews: таблица, поиск, три статус-фильтра (включая $in), add-button отсутствует (woAdd:true)', async ({
  page,
}) => {
  await page.goto('/mock-interviews');

  await expect(table.rows(page)).toHaveCount(5);
  await expect(page.locator('[data-testid="table-add-button"]')).toHaveCount(0);

  // "Ожидают" -> status $in [draft, active] — см. комментарий вверху про дублирующийся
  // testid, кликаем по позиции, а не по table.clickFilter.
  await clickMockInterviewFilterByPosition(page, 1);
  await expect(table.rows(page)).toHaveCount(2);
  const waitingIds = await table.rows(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-row-id')));
  expect(waitingIds.sort()).toEqual(['m1', 'm2']);

  // "Начались" -> status === 'started', testid уникален, можно обычным путём
  await table.clickFilter(page, 'status', 'started');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Mock Started one');

  // "Закончились" -> status $in [completed, evaluated]
  await clickMockInterviewFilterByPosition(page, 3);
  await expect(table.rows(page)).toHaveCount(2);
  const doneIds = await table.rows(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-row-id')));
  expect(doneIds.sort()).toEqual(['m4', 'm5']);

  await table.clickFilter(page, 'status');
  await expect(table.rows(page)).toHaveCount(5);

  await table.search(page, 'Completed');
  await expect(table.rows(page)).toHaveCount(1);
  await expect(table.rows(page).first()).toContainText('Mock Completed one');
});
