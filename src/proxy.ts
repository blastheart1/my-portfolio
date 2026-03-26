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

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/edit/login', request.url));
  }

  try {
    await verifyAdminJWT(token);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/edit/login', request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ['/edit/:path*'],
};
