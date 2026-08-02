import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminJWT } from './admin-auth';

/**
 * Inline admin auth guard for API route handlers.
 *
 * This is the second of two enforcement layers. The proxy (src/proxy.ts)
 * matches /edit/:path* and /api/admin/:path* and rejects unauthenticated
 * requests before they reach a handler — but handlers call this directly as
 * well, so narrowing the matcher cannot silently reopen the hole. It is also
 * the only layer for routes outside the matcher that mix a public GET with
 * protected mutations (e.g. /api/chatbot/examples/[id], /api/blog/generate).
 *
 * Call it before any database or provider access so unauthenticated requests
 * cost nothing and cannot leak a DB error in place of a 401.
 *
 * Returns null if the request is authorized.
 * Returns a NextResponse(401) if it is not.
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await verifyAdminJWT(token);
    return null;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
