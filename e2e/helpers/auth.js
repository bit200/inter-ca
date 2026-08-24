// Логин через форму. Креды тестового пользователя — через env (см. README),
// в репозитории не хранятся.
async function login(page, { username, password } = {}) {
  const user = username || process.env.E2E_USERNAME;
  const pass = password || process.env.E2E_PASSWORD;
  if (!user || !pass) {
    throw new Error('Set E2E_USERNAME / E2E_PASSWORD (env or .env в e2e/) перед запуском тестов, требующих логина.');
  }

  await page.goto('/login');
  await page.locator('[data-testid="login-username"]').fill(user);
  await page.locator('[data-testid="login-password"]').fill(pass);
  await page.locator('#login-submit').click();
  // логин делает hard-редирект (window.location.href = '/'), ждём именно навигацию,
  // не просто исчезновение формы
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
}

module.exports = { login };
