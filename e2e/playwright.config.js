// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Запускается только руками (npm test), не подключено к CI — см. ../E2E_TEST_PLAN.md
// про причину (флейковость внешнего itk-live сервиса) и про то, какой слой тестов
// вообще имеет смысл гонять в CI, а какой только вручную.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Полный параллелизм здесь оказался хуже, а не лучше: несколько Chromium с
  // video/trace-записью одновременно на одной машине дают и флейк в тестах,
  // завязанных на реальные setTimeout-задержки (mock-interview.spec.js меряет
  // FINISH_DELAY_MS~5с против 6с окна — под нагрузкой не укладывается), и просто
  // медленнее по факту (10.7м параллельно vs 54с последовательно на этой машине).
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
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
