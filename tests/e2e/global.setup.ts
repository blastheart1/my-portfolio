/**
 * Global setup — authenticates as admin once and persists the session cookie
 * to tests/e2e/fixtures/admin-auth.json so all subsequent tests can skip login.
 *
 * Runs before every test run via playwright.config.ts `projects[setup]`.
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const STORAGE_STATE = path.join(__dirname, 'fixtures/admin-auth.json');

setup('authenticate as admin', async ({ page }) => {
  const password = process.env.ADMIN_PASSWORD ?? 'admin1234';

  await page.goto('/edit/login');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to the dashboard
  await page.waitForURL('**/edit', { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

  // Persist cookies / localStorage to the fixture file
  await page.context().storageState({ path: STORAGE_STATE });
});
