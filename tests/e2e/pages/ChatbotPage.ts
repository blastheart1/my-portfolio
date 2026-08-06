/**
 * Page Object Model — Chatbot widget on the homepage.
 *
 * The chatbot toggle is an <img> with aria-label="Open AI Chatbot".
 * The chat window is identified by data-chat-window="true".
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ChatbotPage {
  readonly page: Page;

  // Toggle button (floating avatar)
  readonly toggleButton: Locator;

  // Chat window root
  readonly chatWindow: Locator;

  // Close button inside the chat header (X icon)
  readonly closeButton: Locator;

  // Text input field
  readonly messageInput: Locator;

  // Send button
  readonly sendButton: Locator;

  // Consent banner
  readonly consentBanner: Locator;
  readonly consentAllowButton: Locator;
  readonly consentDeclineButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.toggleButton = page.getByRole('button', { name: /open ai chatbot/i });
    this.chatWindow = page.locator('[data-chat-window="true"]');
    this.closeButton = this.chatWindow.getByRole('button').filter({ has: page.locator('svg') }).first();
    this.messageInput = this.chatWindow.locator('input[type="text"]');
    this.sendButton = this.chatWindow.locator('button').filter({ has: page.locator('svg') }).last();
    this.consentBanner = this.chatWindow.locator('text=May I log this conversation');
    this.consentAllowButton = this.chatWindow.getByRole('button', { name: /allow/i });
    this.consentDeclineButton = this.chatWindow.getByRole('button', { name: /no thanks/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async openChat() {
    await this.toggleButton.click();
    await expect(this.chatWindow).toBeVisible({ timeout: 5_000 });
  }

  async closeChat() {
    await this.closeButton.click();
    await expect(this.chatWindow).not.toBeVisible({ timeout: 5_000 });
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.page.screenshot({ path: `playwright-report/screenshots/chatbot-before-send.png` });
    await this.sendButton.click();
  }

  /** Wait for at least one bot reply to appear after sending a message. */
  async waitForBotReply(timeoutMs = 15_000) {
    // Bot messages are bubbles that don't have isUser styling.
    // The bot reply has a class bg-chat-bubble-bot or is simply a div rendered
    // by MessageBubble that is NOT aligned to the right.
    // We wait for a message that is NOT from the user to appear.
    await this.chatWindow
      .locator('div')
      .filter({ hasText: /[\w]/ })
      .nth(1)
      .waitFor({ state: 'visible', timeout: timeoutMs });
  }

  async acceptConsent() {
    await expect(this.consentBanner).toBeVisible({ timeout: 5_000 });
    await this.consentAllowButton.click();
    await expect(this.consentBanner).not.toBeVisible({ timeout: 3_000 });
  }

  async declineConsent() {
    await expect(this.consentBanner).toBeVisible({ timeout: 5_000 });
    await this.consentDeclineButton.click();
    await expect(this.consentBanner).not.toBeVisible({ timeout: 3_000 });
  }
}
