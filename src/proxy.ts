import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all auth in development
  if (process.env.NODE_ENV === 'development') return NextResponse.next();

  // Allow login page and auth endpoints through
  if (pathname === '/edit/login') return NextResponse.next();
  if (pathname.startsWith('/api/admin/auth/')) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirect(request, pathname);
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    return redirect(request, pathname);
  }
}

function redirect(request: NextRequest, pathname: string) {
  // API routes return 401
  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // UI routes redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/edit/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/edit/:path*', '/api/admin/:path*'],
};
