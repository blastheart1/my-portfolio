import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminJWT } from './admin-auth';

/**
 * Inline admin auth guard for API routes under /api/chatbot/* that mix
 * public GET with protected PATCH/DELETE (and therefore can't rely solely
 * on the proxy middleware matcher).
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
