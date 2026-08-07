// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Запускается только руками (npm test), не подключено к CI — см. ../E2E_TEST_PLAN.md
// про причину (флейковость внешнего itk-live сервиса) и про то, какой слой тестов
// вообще имеет смысл гонять в CI, а какой только вручную.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  workers: undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
