/**
 * admin-auth.test.ts
 *
 * Guard rails:
 *   N2  — token verification rejects anything not signed by our secret
 *   1.3 — CRON_SECRET comparison is constant-time and fails closed
 *   P1  — a signed session round-trips and the cookie is hardened
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const VALID_SECRET = 'test-secret-that-is-at-least-32-characters-long';

describe('timingSafeCompare', () => {
  let timingSafeCompare: typeof import('../admin-auth').timingSafeCompare;

  beforeEach(async () => {
    ({ timingSafeCompare } = await import('../admin-auth'));
  });

  it('returns true for identical strings', () => {
    expect(timingSafeCompare('Bearer abc123', 'Bearer abc123')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(timingSafeCompare('Bearer abc123', 'Bearer abc124')).toBe(false);
  });

  it('returns false for different lengths (must not throw)', () => {
    // node:crypto timingSafeEqual throws on length mismatch — we guard for it.
    expect(() => timingSafeCompare('short', 'a-much-longer-value')).not.toThrow();
    expect(timingSafeCompare('short', 'a-much-longer-value')).toBe(false);
  });

  it('fails closed when either side is undefined', () => {
    expect(timingSafeCompare(undefined, 'Bearer abc')).toBe(false);
    expect(timingSafeCompare('Bearer abc', undefined)).toBe(false);
    expect(timingSafeCompare(undefined, undefined)).toBe(false);
  });

  it('fails closed on empty strings — an unset secret must never authenticate', () => {
    expect(timingSafeCompare('', '')).toBe(false);
    expect(timingSafeCompare('Bearer ', '')).toBe(false);
  });

  it('is not fooled by a prefix', () => {
    expect(timingSafeCompare('Bearer abc', 'Bearer abcdef')).toBe(false);
  });

  it('handles multi-byte characters without throwing', () => {
    expect(timingSafeCompare('sécret-ü', 'sécret-ü')).toBe(true);
    expect(timingSafeCompare('sécret-ü', 'sécret-x')).toBe(false);
  });
});

describe('JWT sign/verify round trip', () => {
  const original = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = VALID_SECRET;
  });
  afterEach(() => {
    process.env.JWT_SECRET = original;
  });

  it('verifies a token it just signed and preserves the admin role', async () => {
    const { signAdminJWT, verifyAdminJWT } = await import('../admin-auth');
    const token = await signAdminJWT();
    const payload = await verifyAdminJWT(token);
    expect(payload.role).toBe('admin');
  });

  it('rejects a token signed with a different secret', async () => {
    const { signAdminJWT } = await import('../admin-auth');
    const token = await signAdminJWT();

    process.env.JWT_SECRET = 'a-totally-different-secret-32-chars-long!';
    const { verifyAdminJWT } = await import('../admin-auth');
    await expect(verifyAdminJWT(token)).rejects.toThrow();
  });

  it('rejects garbage', async () => {
    const { verifyAdminJWT } = await import('../admin-auth');
    await expect(verifyAdminJWT('not-a-jwt')).rejects.toThrow();
  });
});

describe('JWT secret validation', () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    process.env.JWT_SECRET = original;
  });

  it('throws when JWT_SECRET is unset', async () => {
    delete process.env.JWT_SECRET;
    const { signAdminJWT } = await import('../admin-auth');
    await expect(signAdminJWT()).rejects.toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is shorter than 32 characters', async () => {
    process.env.JWT_SECRET = 'too-short';
    const { signAdminJWT } = await import('../admin-auth');
    await expect(signAdminJWT()).rejects.toThrow(/32 characters/);
  });
});

describe('session cookie hardening', () => {
  it('sets HttpOnly, Path and SameSite=Strict', async () => {
    const { buildSessionCookie } = await import('../admin-auth');
    const cookie = buildSessionCookie('token-value');

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=28800'); // 8h
  });

  it('clears with Max-Age=0 and no token value', async () => {
    const { buildClearCookie } = await import('../admin-auth');
    const cookie = buildClearCookie();

    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toMatch(/admin_session=;/);
  });
});
