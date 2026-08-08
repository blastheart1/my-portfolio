import { NextResponse } from 'next/server';

import { SEED_NOTES } from '@/lib/demo/relay/seed';

/**
 * The demo inbox.
 *
 * Static, shared and read-only, so it costs nothing and needs no quota. The
 * expensive part is drafting, and that is where the limit sits.
 */
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ notes: SEED_NOTES });
}
