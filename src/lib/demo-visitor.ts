import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { getClientIp } from '@/lib/rate-limit';
import { consumeDemoQuota, DEMO_LIMITS, type QuotaResult } from '@/lib/demo-quota';

/**
 * Visitor identity and quota enforcement for the public demos.
 *
 * The cookie exists so people behind one office NAT do not starve each other,
 * not to enforce anything: it is trivially discarded. Enforcement rides on the
 * IP and subnet buckets, and ultimately on the global ceiling. See demo-quota.
 */

export const VISITOR_COOKIE = 'demo_vid';

export interface DemoVisitor {
  cookieId: string;
  ip: string;
  /** True when the cookie was minted for this request and must be set on the response. */
  isNew: boolean;
}

export function identifyVisitor(request: NextRequest): DemoVisitor {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;

  // A caller-supplied value is only ever a key into their own bucket, so it
  // needs no signature — but it does need bounding, or an oversized cookie
  // becomes a way to write junk into the usage table.
  const valid = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : null;

  return {
    cookieId: valid ?? randomUUID(),
    ip: getClientIp(request),
    isNew: !valid,
  };
}

/** HttpOnly: nothing client-side reads this, so script access is pure downside. */
export function attachVisitorCookie(response: NextResponse, visitor: DemoVisitor): NextResponse {
  if (visitor.isNew) {
    response.cookies.set(VISITOR_COOKIE, visitor.cookieId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

const REFUSAL_COPY: Record<string, string> = {
  cooldown: `Give it ${DEMO_LIMITS.cooldownMinutes} minutes between runs — this calls a paid model.`,
  daily: `That is ${DEMO_LIMITS.perDay} runs for today. The demo resets tomorrow.`,
  ip: `That is ${DEMO_LIMITS.perDay} runs for today. The demo resets tomorrow.`,
  subnet: 'This network has used today’s allowance for the demo.',
  global: 'The demo has hit its daily limit across all visitors. Try again tomorrow.',
};

export function quotaRefusal(result: QuotaResult, visitor: DemoVisitor): NextResponse {
  const body = {
    error: REFUSAL_COPY[result.reason ?? 'daily'] ?? REFUSAL_COPY.daily,
    reason: result.reason,
    remaining: result.remaining,
    retryAfterSeconds: result.retryAfterSeconds,
  };

  const response = NextResponse.json(body, {
    status: 429,
    headers: result.retryAfterSeconds
      ? { 'Retry-After': String(result.retryAfterSeconds) }
      : undefined,
  });

  // Still set the cookie on a refusal, so a first-time visitor who is blocked
  // by the global ceiling does not get a fresh cookie on every retry.
  return attachVisitorCookie(response, visitor);
}

/**
 * Wraps a demo route handler in quota enforcement.
 *
 * The reservation is taken BEFORE the handler runs. Doing it after would let
 * two concurrent requests both pass the check. If the handler throws — a
 * provider being down, not the visitor doing something wrong — the reservation
 * is released, because a failed run should not cost the visitor an attempt.
 */
export function withDemoQuota(
  demoId: string,
  handler: (request: NextRequest, visitor: DemoVisitor) => Promise<NextResponse>,
  /**
   * Checked before any quota is spent. A request that is going to be refused
   * anyway — a hidden demo, an unknown note — must not cost the visitor one of
   * their three runs. Without this, hitting a switched-off demo once put the
   * caller into a five-minute cooldown for a request that never ran — and an
   * oversized upload cost a run despite never reaching a provider.
   */
  precheck?: (request: NextRequest) => Promise<NextResponse | null>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const visitor = identifyVisitor(request);

    if (precheck) {
      const refusal = await precheck(request);
      if (refusal) return attachVisitorCookie(refusal, visitor);
    }

    const quota = await consumeDemoQuota({
      demoId,
      cookieId: visitor.cookieId,
      ip: visitor.ip,
    });

    if (!quota.allowed) return quotaRefusal(quota, visitor);

    try {
      const response = await handler(request, visitor);
      response.headers.set('X-Demo-Remaining', String(quota.remaining));
      return attachVisitorCookie(response, visitor);
    } catch (err) {
      console.error(`Demo "${demoId}" handler failed:`, err);
      await releaseDemoQuota(demoId, visitor).catch(() => {});
      return attachVisitorCookie(
        NextResponse.json(
          { error: 'The demo could not complete that request. Your attempt was not counted.' },
          { status: 502 }
        ),
        visitor
      );
    }
  };
}

/**
 * Hands back a reservation after a failure on our side.
 *
 * Deliberately does not clear last_used_at: the cooldown is a rate control, and
 * refunding it would let a caller who can reliably make the handler fail bypass
 * the interval entirely.
 */
export async function releaseDemoQuota(demoId: string, visitor: DemoVisitor): Promise<void> {
  const { getSql } = await import('@/lib/neon');
  const { hashVisitor, subnetOf } = await import('@/lib/demo-quota');
  const sql = getSql();
  const today = new Date().toISOString().slice(0, 10);

  const keys = [
    `c:${hashVisitor(visitor.cookieId)}`,
    hashVisitor(visitor.ip),
    `s:${hashVisitor(subnetOf(visitor.ip))}`,
  ];

  await sql`
    UPDATE demo_usage SET used = GREATEST(0, used - 1)
    WHERE demo_id = ${demoId} AND usage_day = ${today}::date
      AND visitor_hash = ANY(${keys})
  `;
  await sql`
    UPDATE demo_usage_global SET used = GREATEST(0, used - 1)
    WHERE demo_id = ${demoId} AND usage_day = ${today}::date
  `;
}
