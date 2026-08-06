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
 * Resolve the client IP from proxy headers. Vercel sets x-forwarded-for; the
 * left-most entry is the original client.
 */
export function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
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
