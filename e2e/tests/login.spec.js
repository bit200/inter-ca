const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

// Базовый smoke-тест — проверяет, что сама связка (testid'ы, конфиг baseURL,
// хелпер логина) вообще работает. Остальные тесты по плану опираются на login().
test('логин с валидными кредами уводит со страницы /login', async ({ page }) => {
  test.skip(!process.env.E2E_USERNAME, 'Нужны E2E_USERNAME/E2E_PASSWORD — см. e2e/README.md');

  await login(page);
  await expect(page).not.toHaveURL(/\/login/);
});

test('невалидные креды показывают ошибку и остаются на /login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('[data-testid="login-username"]').fill('no-such-user');
  await page.locator('[data-testid="login-password"]').fill('wrong-password');
  await page.locator('#login-submit').click();

  await expect(page.locator('.userErr')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
