import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminJWT, COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    await verifyAdminJWT(token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
