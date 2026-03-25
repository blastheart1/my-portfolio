import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright E2E configuration for the portfolio project.
 *
 * Required environment variables (set in .env.test.local):
 *   ADMIN_PASSWORD  — plaintext admin password used in E2E tests
 *                     In development the fallback password is "admin1234" when
 *                     ADMIN_PASSWORD_HASH is not set, so you can use that value.
 *
 * Example .env.test.local:
 *   ADMIN_PASSWORD=admin1234
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // Auth state setup — runs once, saves the session cookie for reuse
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    // Main test suite — Chromium only for speed
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'tests/e2e/fixtures/admin-auth.json'),
      },
      dependencies: ['setup'],
      testIgnore: /global\.setup\.ts/,
    },
  ],
  /* Start the Next.js dev server automatically when running locally */
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
