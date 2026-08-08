/**
 * rate-limit.test.ts
 *
 * Guard rail N5 — public AI/email endpoints reject traffic past their budget.
 *
 * Time is injected rather than faked with timers, so these tests are
 * deterministic and cannot flake on a slow machine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getClientIp,
  isRateLimited,
  __resetRateLimits,
  RATE_LIMITS,
} from '../rate-limit';

beforeEach(() => {
  __resetRateLimits();
});

const T0 = 1_000_000;
const WINDOW = 60_000;

describe('isRateLimited — budget enforcement', () => {
  it('allows exactly `limit` calls and rejects the next one', () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited('ip-a', 5, WINDOW, T0), `call ${i + 1}`).toBe(false);
    }
    expect(isRateLimited('ip-a', 5, WINDOW, T0)).toBe(true);
  });

  it('keeps rejecting for the rest of the window', () => {
    for (let i = 0; i < 5; i++) isRateLimited('ip-a', 5, WINDOW, T0);
    expect(isRateLimited('ip-a', 5, WINDOW, T0 + WINDOW - 1)).toBe(true);
  });

  it('resets once the window elapses', () => {
    for (let i = 0; i < 5; i++) isRateLimited('ip-a', 5, WINDOW, T0);
    expect(isRateLimited('ip-a', 5, WINDOW, T0)).toBe(true);

    // One tick past expiry the budget is fresh again.
    expect(isRateLimited('ip-a', 5, WINDOW, T0 + WINDOW + 1)).toBe(false);
  });

  it('treats a limit of 1 correctly (no off-by-one)', () => {
    expect(isRateLimited('ip-solo', 1, WINDOW, T0)).toBe(false);
    expect(isRateLimited('ip-solo', 1, WINDOW, T0)).toBe(true);
  });
});

describe('isRateLimited — key isolation', () => {
  it('does not let one IP consume another IP\'s budget', () => {
    for (let i = 0; i < 5; i++) isRateLimited('ip-a', 5, WINDOW, T0);
    expect(isRateLimited('ip-a', 5, WINDOW, T0)).toBe(true);

    // A different client is unaffected.
    expect(isRateLimited('ip-b', 5, WINDOW, T0)).toBe(false);
  });

  it('scopes budgets per endpoint when the key is namespaced', () => {
    for (let i = 0; i < 5; i++) isRateLimited('contact:ip-a', 5, WINDOW, T0);
    expect(isRateLimited('contact:ip-a', 5, WINDOW, T0)).toBe(true);

    // Same IP, different endpoint namespace — separate bucket.
    expect(isRateLimited('chatbot:ip-a', 5, WINDOW, T0)).toBe(false);
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://codebyluis.dev/api/contact', { headers });

  // Corrected 2026-08-08. This previously asserted the LEFT-most entry, which
  // encoded a vulnerability as a requirement: the left-most hop is whatever
  // the caller sent, so every limiter keyed on it was trivially bypassable.
  // See client-ip.test.ts for the spoofing cases.
  it('takes the right-most x-forwarded-for entry, appended by the proxy', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' })))
      .toBe('70.41.3.18');
  });

  it('trims whitespace', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '  203.0.113.7 , 70.41.3.18  ' })))
      .toBe('70.41.3.18');
  });

  it('prefers x-real-ip over a client-supplied forwarded chain', () => {
    expect(getClientIp(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
  });

  it('falls back to "unknown" when no proxy headers are present', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });

  it('does not return an empty string for a blank header', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '' }))).toBe('unknown');
  });
});

describe('RATE_LIMITS budgets', () => {
  it('defines a budget for every rate-limited endpoint', () => {
    expect(Object.keys(RATE_LIMITS).sort()).toEqual(
      ['chatbot', 'contact', 'generatePrompt', 'login', 'sendLead'].sort()
    );
  });

  it('uses positive, finite budgets', () => {
    for (const [name, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.limit, name).toBeGreaterThan(0);
      expect(cfg.windowMs, name).toBeGreaterThan(0);
      expect(Number.isFinite(cfg.limit), name).toBe(true);
    }
  });

  it('keeps email endpoints stricter than the chatbot', () => {
    // Sending mail is more abusable than asking a question.
    expect(RATE_LIMITS.contact.limit).toBeLessThan(RATE_LIMITS.chatbot.limit);
    expect(RATE_LIMITS.sendLead.limit).toBeLessThan(RATE_LIMITS.chatbot.limit);
  });
});
