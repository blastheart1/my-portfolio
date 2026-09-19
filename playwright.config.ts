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

/**
 * This project's dev server runs on 3099, not Next's default 3000. The old
 * default here meant a local run either hit nothing or, worse, hit whatever
 * other project happened to be on 3000.
 *
 * Point it at a preview deployment to run the SEO specs against real
 * infrastructure:  PLAYWRIGHT_BASE_URL=<preview-url> npm run test:e2e
 */
const PORT = process.env.PORT ?? '3099';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

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
    /**
     * The crawler-facing specs, run as nobody.
     *
     * Separate from the suite below because they must NOT be authenticated:
     * they assert what an anonymous crawler receives, and running them with an
     * admin session would be testing the wrong condition. It also means they
     * do not depend on the auth setup, so they still run without an
     * ADMIN_PASSWORD configured — which matters, because these are the checks
     * worth pointing at a preview deployment.
     */
    {
      name: 'public',
      testMatch: /(seo|structured-data)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
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
      testIgnore: /(global\.setup|seo\.spec|structured-data\.spec)\.ts/,
    },
  ],
  /* Start the Next.js dev server automatically when running locally */
  webServer: {
    command: `next dev --turbopack --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
