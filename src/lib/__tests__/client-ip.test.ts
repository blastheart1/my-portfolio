/**
 * client-ip.test.ts
 *
 * getClientIp() used to return the LEFTMOST x-forwarded-for entry. Vercel
 * appends the real client address to whatever XFF header the caller sends, so
 * the leftmost value is attacker-controlled. Any caller could mint a fresh
 * identity per request by sending `X-Forwarded-For: <random>`, which defeated
 * every rate limit in the app — including the admin login limiter, the only
 * brute-force protection on a single shared password.
 *
 * The trusted value is the one a proxy we control wrote: x-vercel-forwarded-for
 * or x-real-ip, and failing those the RIGHTMOST XFF entry, which is the hop
 * nearest us rather than the hop furthest away.
 */

import { describe, it, expect, afterEach } from 'vitest';

import { getClientIp } from '../rate-limit';

function req(headers: Record<string, string>) {
  return new Request('https://example.com', { headers });
}

describe('spoofed headers cannot mint a new identity', () => {
  it('ignores a client-supplied XFF when the platform header is present', () => {
    const ip = getClientIp(
      req({
        'x-forwarded-for': '1.2.3.4',
        'x-vercel-forwarded-for': '203.0.113.9',
      })
    );

    expect(ip).toBe('203.0.113.9');
  });

  it('prefers x-real-ip over a client-supplied XFF', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '203.0.113.9' }))).toBe(
      '203.0.113.9'
    );
  });

  it('takes the rightmost XFF entry, not the leftmost', () => {
    // Client sent "9.9.9.9"; the proxy appended the real address.
    expect(getClientIp(req({ 'x-forwarded-for': '9.9.9.9, 198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('is stable no matter how much junk the caller prepends', () => {
    const a = getClientIp(req({ 'x-forwarded-for': 'a, b, c, 198.51.100.7' }));
    const b = getClientIp(req({ 'x-forwarded-for': 'totally-different, 198.51.100.7' }));

    expect(a).toBe(b);
  });
});

describe('degenerate input', () => {
  it('falls back to a single shared bucket when no header is present', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });

  it('trims whitespace', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '  198.51.100.7  ' }))).toBe('198.51.100.7');
  });

  it('ignores an empty header rather than returning an empty key', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '' }))).toBe('unknown');
  });
});

describe('on-platform, an unproxied forwarded chain is ignored entirely', () => {
  const ORIGINAL = process.env.VERCEL;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = ORIGINAL;
  });

  function setEnv(value: string) {
    if (value === 'production') process.env.VERCEL = '1';
    else delete process.env.VERCEL;
  }

  it('refuses to trust x-forwarded-for when the platform header is absent', () => {
    setEnv('production');

    // On Vercel every real request carries x-vercel-forwarded-for. Reaching
    // the fallback means the request bypassed our proxy, and then the whole
    // chain is caller-supplied — rightmost included.
    expect(getClientIp(req({ 'x-forwarded-for': '8.8.8.8' }))).toBe('unknown');
  });

  it('gives every spoofer the same shared bucket rather than a fresh one', () => {
    setEnv('production');

    const a = getClientIp(req({ 'x-forwarded-for': '1.1.1.1' }));
    const b = getClientIp(req({ 'x-forwarded-for': '2.2.2.2' }));

    expect(a).toBe(b);
  });

  it('still honours the platform header on Vercel', () => {
    setEnv('production');

    expect(getClientIp(req({ 'x-vercel-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('keeps the forwarded chain usable off-platform for local testing', () => {
    setEnv('development');

    expect(getClientIp(req({ 'x-forwarded-for': '9.9.9.9, 198.51.100.7' }))).toBe('198.51.100.7');
  });
});
