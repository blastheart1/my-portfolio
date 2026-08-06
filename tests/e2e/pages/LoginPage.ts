/**
 * Page Object Model — Admin login page at /edit/login.
 *
 * The login form has a single password field (no username field).
 * On success it redirects to /edit.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('p.text-red-600, p.text-red-400');
  }

  async goto() {
    await this.page.goto('/edit/login');
    await expect(this.passwordInput).toBeVisible();
  }

  async login(password: string) {
    await this.passwordInput.fill(password);
    await this.page.screenshot({ path: `playwright-report/screenshots/login-filled.png` });
    await this.submitButton.click();
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL('**/edit', { timeout: 10_000 });
    await expect(this.page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await this.page.screenshot({ path: `playwright-report/screenshots/login-dashboard.png` });
  }

  async expectError(text?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible({ timeout: 5_000 });
    if (text) {
      await expect(this.errorMessage).toContainText(text);
    }
  }
}
