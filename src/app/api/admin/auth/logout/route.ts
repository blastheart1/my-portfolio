import { NextResponse } from 'next/server';
import { buildClearCookie } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', buildClearCookie());
  return response;
}
