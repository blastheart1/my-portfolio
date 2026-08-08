import { NextRequest, NextResponse } from 'next/server';

import { getSql } from '@/lib/neon';
import { DEMO_LIMITS, hashVisitor } from '@/lib/demo-quota';
import { identifyVisitor, attachVisitorCookie } from '@/lib/demo-visitor';

/**
 * Remaining demo allowance, so the UI can say "2 runs left today" before the
 * visitor spends one.
 *
 * Read-only: it must never consume quota, or polling the indicator would burn
 * the allowance it is reporting on.
 */
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const visitor = identifyVisitor(request);
  const demoId = new URL(request.url).searchParams.get('demo') ?? 'relay';
  const today = new Date().toISOString().slice(0, 10);

  const fallback = {
    limit: DEMO_LIMITS.perDay,
    remaining: DEMO_LIMITS.perDay,
    cooldownMinutes: DEMO_LIMITS.cooldownMinutes,
    retryAfterSeconds: 0,
  };

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT used, last_used_at FROM demo_usage
      WHERE visitor_hash = ${hashVisitor(visitor.ip)}
        AND demo_id = ${demoId} AND usage_day = ${today}::date
    `) as unknown as { used: number; last_used_at: string | null }[];

    const used = rows[0]?.used ?? 0;
    const last = rows[0]?.last_used_at ? new Date(rows[0].last_used_at).getTime() : 0;
    const elapsed = Date.now() - last;
    const cooldownMs = DEMO_LIMITS.cooldownMinutes * 60_000;

    return attachVisitorCookie(
      NextResponse.json({
        limit: DEMO_LIMITS.perDay,
        remaining: Math.max(0, DEMO_LIMITS.perDay - used),
        cooldownMinutes: DEMO_LIMITS.cooldownMinutes,
        retryAfterSeconds: last && elapsed < cooldownMs ? Math.ceil((cooldownMs - elapsed) / 1000) : 0,
      }),
      visitor
    );
  } catch (err) {
    // An indicator is not worth failing a page load over. Reporting the full
    // allowance is safe: the write path enforces the real limit regardless of
    // what this said.
    console.error('GET /api/demo/quota error:', err);
    return attachVisitorCookie(NextResponse.json(fallback), visitor);
  }
}
