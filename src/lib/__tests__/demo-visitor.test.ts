/**
 * demo-visitor.test.ts
 *
 * The cookie is a courtesy, not a control. What must hold is that the handler
 * never runs when quota is exhausted, that a caller cannot widen their own
 * bucket through the cookie, and that a failure on our side does not cost the
 * visitor an attempt.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const consumeDemoQuota = vi.fn();
vi.mock('@/lib/demo-quota', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/demo-quota')>()),
  consumeDemoQuota: (...args: unknown[]) => consumeDemoQuota(...args),
}));

const sqlMock = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/neon', () => ({ getSql: () => sqlMock }));

import {
  identifyVisitor,
  withDemoQuota,
  VISITOR_COOKIE,
} from '../demo-visitor';

function request(headers: Record<string, string> = {}, cookie?: string) {
  return new NextRequest('https://codebyluis.dev/api/demo/relay/draft', {
    method: 'POST',
    headers: { ...headers, ...(cookie ? { cookie: `${VISITOR_COOKIE}=${cookie}` } : {}) },
  });
}

const ALLOWED = { allowed: true, used: 1, remaining: 2 };

beforeEach(() => {
  consumeDemoQuota.mockReset();
  consumeDemoQuota.mockResolvedValue(ALLOWED);
  sqlMock.mockClear();
});

describe('identity', () => {
  it('mints a cookie id for a first-time visitor', () => {
    const visitor = identifyVisitor(request({ 'x-real-ip': '203.0.113.7' }));

    expect(visitor.isNew).toBe(true);
    expect(visitor.cookieId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a valid existing cookie', () => {
    const id = '11111111-2222-3333-4444-555555555555';

    const visitor = identifyVisitor(request({ 'x-real-ip': '203.0.113.7' }, id));

    expect(visitor.cookieId).toBe(id);
    expect(visitor.isNew).toBe(false);
  });

  it('discards a malformed cookie rather than keying on it', () => {
    // An unbounded caller-supplied value is a way to write junk rows into the
    // usage table, so anything that is not a UUID is replaced.
    const visitor = identifyVisitor(request({}, 'x'.repeat(5000)));

    expect(visitor.cookieId).not.toContain('xxxx');
    expect(visitor.isNew).toBe(true);
  });

  it('takes the IP from a header the caller cannot forge', () => {
    const visitor = identifyVisitor(
      request({ 'x-forwarded-for': '1.2.3.4', 'x-vercel-forwarded-for': '203.0.113.7' })
    );

    expect(visitor.ip).toBe('203.0.113.7');
  });
});

describe('happy path', () => {
  it('runs the handler and reports what is left', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const res = await withDemoQuota('relay', handler)(request({ 'x-real-ip': '203.0.113.7' }));

    expect(handler).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Demo-Remaining')).toBe('2');
  });

  it('sets the visitor cookie HttpOnly', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const res = await withDemoQuota('relay', handler)(request({ 'x-real-ip': '203.0.113.7' }));

    const cookie = res.cookies.get(VISITOR_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
  });
});

describe('refusal never reaches the provider', () => {
  it.each([
    ['cooldown', 'minutes between runs'],
    ['daily', 'resets tomorrow'],
    ['subnet', 'network has used'],
    ['global', 'across all visitors'],
  ])('refuses on %s without calling the handler', async (reason, copy) => {
    consumeDemoQuota.mockResolvedValue({ allowed: false, used: 3, remaining: 0, reason });
    const handler = vi.fn();

    const res = await withDemoQuota('relay', handler)(request({ 'x-real-ip': '203.0.113.7' }));
    const body = (await res.json()) as { error: string; reason: string };

    expect(res.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
    expect(body.error).toContain(copy);
    expect(body.reason).toBe(reason);
  });

  it('sends Retry-After when a cooldown is in force', async () => {
    consumeDemoQuota.mockResolvedValue({
      allowed: false, used: 1, remaining: 2, reason: 'cooldown', retryAfterSeconds: 240,
    });

    const res = await withDemoQuota('relay', vi.fn())(request({ 'x-real-ip': '203.0.113.7' }));

    expect(res.headers.get('Retry-After')).toBe('240');
  });

  it('still sets the cookie on a refusal', async () => {
    consumeDemoQuota.mockResolvedValue({ allowed: false, used: 3, remaining: 0, reason: 'global' });

    const res = await withDemoQuota('relay', vi.fn())(request({ 'x-real-ip': '203.0.113.7' }));

    // Otherwise a blocked first-time visitor gets a fresh cookie every retry,
    // which is a slow way to fill the usage table.
    expect(res.cookies.get(VISITOR_COOKIE)).toBeDefined();
  });
});

describe('our failures are not charged to the visitor', () => {
  it('releases the reservation when the handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('provider timeout'));

    const res = await withDemoQuota('relay', handler)(request({ 'x-real-ip': '203.0.113.7' }));

    expect(res.status).toBe(502);
    const queries = sqlMock.mock.calls.map(c => (c[0] as TemplateStringsArray).join('?'));
    expect(queries.some(q => /UPDATE demo_usage SET used = GREATEST/i.test(q))).toBe(true);
    expect(queries.some(q => /demo_usage_global SET used = GREATEST/i.test(q))).toBe(true);
  });

  it('says the attempt was not counted', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));

    const res = await withDemoQuota('relay', handler)(request({ 'x-real-ip': '203.0.113.7' }));

    expect((await res.json()).error).toMatch(/not counted/i);
  });

  it('does not refund the cooldown', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));

    await withDemoQuota('relay', handler)(request({ 'x-real-ip': '203.0.113.7' }));

    // Clearing last_used_at would let anyone who can reliably break the
    // handler skip the interval entirely.
    const queries = sqlMock.mock.calls.map(c => (c[0] as TemplateStringsArray).join('?'));
    expect(queries.some(q => /last_used_at\s*=\s*NULL/i.test(q))).toBe(false);
  });
});
