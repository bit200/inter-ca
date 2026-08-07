// Хелпер для общего CRUD-движка (libs/DefList + libs/Table/*), на котором построены
// suggestions/requests/interviews/quiz/mock-interviews. Один хелпер вместо копипасты
// по каждому разделу — см. E2E_TEST_PLAN.md, тикет "foundation".

async function search(page, term) {
  const input = page.locator('[data-testid="table-search-input"]');
  await input.fill(term);
  // онсерч дебаунсится в Table.js — небольшая пауза перед проверкой результата
  await page.waitForTimeout(600);
}

async function clickAdd(page) {
  await page.locator('[data-testid="table-add-button"]').click();
}

// filterKey — ключ из top_filters (напр. "status"), value — значение опции
// ("started", "completed", ...), либо не передавать value для кнопки "Все"/def_name
async function clickFilter(page, filterKey, value) {
  const testId = value ? `table-filter-${filterKey}-${value}` : `table-filter-${filterKey}-all`;
  await page.locator(`[data-testid="${testId}"]`).click();
}

function rows(page) {
  return page.locator('[data-testid="table-row"]');
}

async function rowByText(page, text) {
  return rows(page).filter({ hasText: text }).first();
}

async function openRowByText(page, text) {
  await (await rowByText(page, text)).click();
}

module.exports = { search, clickAdd, clickFilter, rows, rowByText, openRowByText };
