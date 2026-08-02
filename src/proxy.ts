import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminJWT, COOKIE_NAME } from '@/lib/admin-auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Whitelist: login page + all auth API routes pass through
  if (
    pathname === '/edit/login' ||
    pathname.startsWith('/api/admin/auth/')
  ) {
    return NextResponse.next();
  }

  // API callers get a 401 they can handle; page navigations get a redirect.
  const isApi = pathname.startsWith('/api/');
  const deny = () =>
    isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/edit/login', request.url));

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return deny();
  }

  try {
    await verifyAdminJWT(token);
    return NextResponse.next();
  } catch {
    const res = deny();
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

// NOTE: this is only the first of two layers. Every handler under
// /api/admin/** also calls requireAdmin() directly, so narrowing this matcher
// cannot silently reopen the hole. See docs/plans/AUDIT-2026-08-02.md §1.1.
export const config = {
  matcher: ['/edit/:path*', '/api/admin/:path*'],
};
