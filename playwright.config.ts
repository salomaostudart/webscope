import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: {
    command: 'npx astro dev --port 4321',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
