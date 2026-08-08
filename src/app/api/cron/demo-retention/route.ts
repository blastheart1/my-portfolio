import { NextRequest, NextResponse } from 'next/server';

import { timingSafeCompare } from '@/lib/admin-auth';
import { getSql } from '@/lib/neon';

/**
 * Sweeps the demo tables.
 *
 * Without this both grow forever: a usage row per visitor per day, and a note
 * for every capture. Neither has any value once the day it belongs to has
 * passed, and keeping visitor-linked rows longer than they are useful is a
 * liability rather than an asset.
 *
 * Deletes are bounded by date and scoped to the demo tables only. This is the
 * one place in the codebase that removes rows on a schedule, so it stays
 * deliberately narrow.
 */
export const runtime = 'nodejs';

const NOTE_RETENTION_DAYS = 7;
const USAGE_RETENTION_DAYS = 30;

export async function GET(request: NextRequest) {
  // Constant-time compare, and fail closed when the secret is unset — a
  // literal "Bearer " header must not authenticate against an empty value.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || !timingSafeCompare(auth ?? undefined, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sql = getSql();

    const notes = (await sql`
      DELETE FROM demo_notes
      WHERE created_at < now() - ${`${NOTE_RETENTION_DAYS} days`}::interval
      RETURNING id
    `) as unknown as unknown[];
    const usage = (await sql`
      DELETE FROM demo_usage
      WHERE usage_day < CURRENT_DATE - ${USAGE_RETENTION_DAYS}
      RETURNING visitor_hash
    `) as unknown as unknown[];
    const global = (await sql`
      DELETE FROM demo_usage_global
      WHERE usage_day < CURRENT_DATE - ${USAGE_RETENTION_DAYS}
      RETURNING demo_id
    `) as unknown as unknown[];

    return NextResponse.json({
      ok: true,
      deleted: { notes: notes.length, usage: usage.length, global: global.length },
    });
  } catch (err) {
    console.error('GET /api/cron/demo-retention error:', err);
    return NextResponse.json({ error: 'Retention sweep failed' }, { status: 500 });
  }
}
