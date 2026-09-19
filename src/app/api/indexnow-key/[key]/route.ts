import { NextRequest, NextResponse } from 'next/server';

import { getIndexNowKey } from '@/lib/indexnow';

/**
 * IndexNow key verification file.
 *
 * The protocol asks for a plain-text file at the site root whose filename is the
 * key and whose body is the key. `/{key}.txt` rewrites here (see
 * next.config.ts) because an `app/[key].txt/` segment is not parsed as dynamic —
 * the suffix makes Next treat the whole folder name as a literal — and a bare
 * root-level `[key]` route would shadow every unknown top-level path and
 * swallow the 404 page.
 *
 * The key lives in the environment rather than in public/, because a key
 * committed to the repo has to be rotated the moment the repo is shared.
 * Anything that is not the configured key 404s, so this cannot be probed to
 * discover it.
 */
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const configured = getIndexNowKey();

  // Compared in full rather than by prefix: a prefix match would let the key be
  // guessed a character at a time.
  if (!configured || key !== configured) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(configured, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // Re-fetched on every submission, so it must not come from a stale edge
      // cache after a key rotation.
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
