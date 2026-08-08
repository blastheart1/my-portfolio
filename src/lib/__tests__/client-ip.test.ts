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

import { describe, it, expect } from 'vitest';

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
