import type { NextRequest } from 'next/server';

/**
 * Best-effort in-memory IP rate limiting.
 *
 * SCOPE: state lives in the module closure, so it is per-Fluid-Compute-instance,
 * not global. A determined attacker hitting several instances gets a
 * proportionally higher budget. That is an acceptable trade for a personal site
 * — it costs nothing and stops casual abuse and accidental loops. If real abuse
 * shows up, escalate to Vercel Firewall rate-limiting rules (dashboard
 * configuration, no code) rather than adding a Redis dependency.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Number of distinct keys retained before the map is swept of stale entries. */
const SWEEP_THRESHOLD = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * The client address, from a source the caller cannot forge.
 *
 * This previously returned the LEFTMOST x-forwarded-for entry. Vercel appends
 * the real address to whatever XFF header arrives, so the leftmost value is
 * whatever the caller decided to send. Anyone could mint a fresh identity per
 * request with `X-Forwarded-For: <random>` and walk straight through every
 * rate limit here, including the admin login limiter.
 *
 * Order of trust:
 *   1. x-vercel-forwarded-for — written by Vercel's proxy, overwrites any
 *      client-supplied copy.
 *   2. x-real-ip — likewise platform-set.
 *   3. Off-platform only, the RIGHTMOST x-forwarded-for entry — the hop nearest
 *      us rather than the hop furthest away. On Vercel this is never reached,
 *      because a request without the platform header did not come through the
 *      proxy and its whole chain is caller-supplied.
 *
 * Unknown callers share one bucket, which is deliberately the harshest
 * outcome: an attacker who strips every header gets rate-limited against
 * everyone else who did the same.
 */
export function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;

  const platform =
    headers.get('x-vercel-forwarded-for')?.trim() || headers.get('x-real-ip')?.trim();
  if (platform) return platform;

  // On Vercel the platform header is always present, so reaching here means the
  // request did not come through the proxy — and then x-forwarded-for is
  // entirely caller-supplied, rightmost entry included. Trusting it would hand a
  // fresh identity to anyone who asks, which is the exact hole this function was
  // fixed to close. Everyone who strips the headers shares one bucket instead.
  //
  // Gated on VERCEL rather than NODE_ENV because bundlers inline NODE_ENV at
  // build time, and a security decision should not depend on a value frozen by
  // the compiler. Off-platform, the forwarded chain is honoured so local runs
  // and self-hosting still work.
  if (process.env.VERCEL) return 'unknown';

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map(hop => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return 'unknown';
}

/**
 * Consume one unit from `key`'s budget.
 *
 * @returns true when the caller is over budget and should be rejected with 429.
 *
 * `now` is injectable so tests can advance time without real timers.
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): boolean {
  if (buckets.size > SWEEP_THRESHOLD) sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= limit) return true;

  bucket.count++;
  return false;
}

/** Test-only: drop all state so suites do not leak budget into each other. */
export function __resetRateLimits(): void {
  buckets.clear();
}

/**
 * Per-endpoint budgets, centralised so they are reviewable in one place.
 * Chatbot is the most expensive per call; contact/lead send real email.
 */
export const RATE_LIMITS = {
  chatbot: { limit: 20, windowMs: 5 * 60 * 1000 },
  contact: { limit: 5, windowMs: 15 * 60 * 1000 },
  sendLead: { limit: 5, windowMs: 15 * 60 * 1000 },
  generatePrompt: { limit: 30, windowMs: 5 * 60 * 1000 },
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;
