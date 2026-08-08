/**
 * demo-quota.test.ts
 *
 * The Relay demo calls paid providers from an endpoint with no login. A cookie
 * cannot be the control: clearing it, or opening a private window, mints a new
 * visitor. So the cookie is a convenience for honest visitors and every real
 * limit sits on something the caller cannot choose.
 *
 * Four buckets, all of which must allow a request:
 *
 *   cookie  — per browser, keeps NAT neighbours from starving each other
 *   ip      — survives clearing cookies
 *   subnet  — survives cycling addresses within one /24 or /48
 *   global  — the ceiling that bounds spend no matter what anyone does
 *
 * The most restrictive wins. A caller who defeats the first three still cannot
 * get past the fourth, which is the only guarantee that actually bounds cost.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  consumeDemoQuota,
  subnetOf,
  hashVisitor,
  DEMO_LIMITS,
  __setQuotaClock,
  __resetQuotaStore,
} from '../demo-quota';

let now = new Date('2026-08-08T12:00:00Z');

beforeEach(() => {
  now = new Date('2026-08-08T12:00:00Z');
  __setQuotaClock(() => now);
  __resetQuotaStore();
});

function advance(minutes: number) {
  now = new Date(now.getTime() + minutes * 60_000);
}

const VISITOR = { cookieId: 'cookie-a', ip: '203.0.113.7' };

async function use(over: Partial<typeof VISITOR> = {}) {
  return consumeDemoQuota({ demoId: 'relay', ...VISITOR, ...over });
}

describe('happy path', () => {
  it('allows the first use and reports what is left', async () => {
    const result = await use();

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(DEMO_LIMITS.perDay - 1);
  });

  it('allows the full daily allowance when spaced past the cooldown', async () => {
    for (let i = 0; i < DEMO_LIMITS.perDay; i++) {
      expect((await use()).allowed).toBe(true);
      advance(DEMO_LIMITS.cooldownMinutes);
    }
  });

  it('resets the next day', async () => {
    for (let i = 0; i < DEMO_LIMITS.perDay; i++) {
      await use();
      advance(DEMO_LIMITS.cooldownMinutes);
    }
    expect((await use()).allowed).toBe(false);

    advance(60 * 24);

    expect((await use()).allowed).toBe(true);
  });
});

describe('daily cap', () => {
  it('refuses the use after the allowance is spent', async () => {
    for (let i = 0; i < DEMO_LIMITS.perDay; i++) {
      await use();
      advance(DEMO_LIMITS.cooldownMinutes);
    }

    const result = await use();

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily');
  });

  it('does not keep counting past the cap', async () => {
    for (let i = 0; i < DEMO_LIMITS.perDay + 5; i++) {
      await use();
      advance(DEMO_LIMITS.cooldownMinutes);
    }

    expect((await use()).used).toBe(DEMO_LIMITS.perDay);
  });
});

describe('cooldown', () => {
  it('refuses a second use inside the window', async () => {
    await use();

    const result = await use();

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cooldown');
  });

  it('reports when the caller may retry', async () => {
    await use();
    advance(2);

    const result = await use();

    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(DEMO_LIMITS.cooldownMinutes * 60);
  });

  it('allows the use once the window has elapsed', async () => {
    await use();
    advance(DEMO_LIMITS.cooldownMinutes);

    expect((await use()).allowed).toBe(true);
  });

  it('does not extend the cooldown when a blocked caller keeps retrying', async () => {
    await use();
    advance(1);
    await use(); // blocked
    advance(1);
    await use(); // blocked
    advance(DEMO_LIMITS.cooldownMinutes - 2);

    // The clock runs from the last ALLOWED use, not the last attempt.
    // Otherwise a retry loop locks the visitor out permanently.
    expect((await use()).allowed).toBe(true);
  });

  it('does not consume allowance on a blocked attempt', async () => {
    await use();
    await use(); // blocked by cooldown
    await use(); // blocked by cooldown
    advance(DEMO_LIMITS.cooldownMinutes);

    expect((await use()).allowed).toBe(true);
  });
});

describe('clearing cookies does not reset anything', () => {
  it('still counts against the same IP under a fresh cookie', async () => {
    for (let i = 0; i < DEMO_LIMITS.perDay; i++) {
      await use({ cookieId: `fresh-${i}` });
      advance(DEMO_LIMITS.cooldownMinutes);
    }

    const result = await use({ cookieId: 'brand-new-cookie' });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ip');
  });

  it('applies the cooldown to a fresh cookie on the same IP', async () => {
    await use({ cookieId: 'first' });

    const result = await use({ cookieId: 'second' });

    expect(result.allowed).toBe(false);
  });

  it('gives a genuinely different IP its own allowance', async () => {
    for (let i = 0; i < DEMO_LIMITS.perDay; i++) {
      await use();
      advance(DEMO_LIMITS.cooldownMinutes);
    }

    expect((await use({ ip: '198.51.100.20', cookieId: 'other' })).allowed).toBe(true);
  });
});

describe('cycling addresses within a subnet does not reset anything', () => {
  it('groups IPv4 addresses by /24', () => {
    expect(subnetOf('203.0.113.7')).toBe(subnetOf('203.0.113.200'));
    expect(subnetOf('203.0.113.7')).not.toBe(subnetOf('203.0.114.7'));
  });

  it('groups IPv6 addresses by /48', () => {
    expect(subnetOf('2001:db8:1234:5678::1')).toBe(subnetOf('2001:db8:1234:9999::2'));
    expect(subnetOf('2001:db8:1234::1')).not.toBe(subnetOf('2001:db8:9999::1'));
  });

  it('blocks a caller hopping addresses inside one subnet', async () => {
    for (let i = 0; i < DEMO_LIMITS.perSubnetPerDay; i++) {
      await use({ ip: `203.0.113.${i + 1}`, cookieId: `c-${i}` });
      advance(DEMO_LIMITS.cooldownMinutes);
    }

    const result = await use({ ip: '203.0.113.250', cookieId: 'c-final' });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('subnet');
  });
});

describe('global ceiling is the real bound', () => {
  it('refuses everyone once the daily ceiling is reached', async () => {
    for (let i = 0; i < DEMO_LIMITS.globalPerDay; i++) {
      await use({ ip: `10.${Math.floor(i / 250)}.${i % 250}.1`, cookieId: `c-${i}` });
    }

    const result = await use({ ip: '172.16.0.1', cookieId: 'untouched' });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('global');
  });

  it('blocks even a visitor who has spent nothing', async () => {
    for (let i = 0; i < DEMO_LIMITS.globalPerDay; i++) {
      await use({ ip: `10.${Math.floor(i / 250)}.${i % 250}.1`, cookieId: `c-${i}` });
    }

    expect((await use({ ip: '192.0.2.99', cookieId: 'nothing-spent' })).allowed).toBe(false);
  });
});

describe('identifiers are not stored raw', () => {
  it('hashes the visitor so no raw IP reaches the database', () => {
    const hash = hashVisitor('203.0.113.7');

    expect(hash).not.toContain('203.0.113.7');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is stable for the same input and different for another', () => {
    expect(hashVisitor('203.0.113.7')).toBe(hashVisitor('203.0.113.7'));
    expect(hashVisitor('203.0.113.7')).not.toBe(hashVisitor('203.0.113.8'));
  });
});

describe('concurrency', () => {
  it('lets exactly one of two simultaneous requests through at the boundary', async () => {
    // Two requests arrive together with one use left in the cooldown-free slot.
    const results = await Promise.all([use(), use()]);

    expect(results.filter(r => r.allowed)).toHaveLength(1);
  });
});
