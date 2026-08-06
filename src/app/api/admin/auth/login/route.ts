import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signAdminJWT, buildSessionCookie } from '@/lib/admin-auth';
import { getClientIp, isRateLimited, RATE_LIMITS } from '@/lib/rate-limit';

// Must use Node.js runtime — bcryptjs does not run on Edge
export const runtime = 'nodejs';

const LoginSchema = z.object({
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const { limit, windowMs } = RATE_LIMITS.login;
  if (isRateLimited(`login:${ip}`, limit, windowMs)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  // Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;

  // Dev-only fallback: if no hash is configured, allow a temporary hardcoded password
  if (!hash) {
    if (process.env.NODE_ENV !== 'development') {
      console.error('ADMIN_PASSWORD_HASH not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    if (parsed.data.password !== 'admin1234') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = await signAdminJWT();
    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', buildSessionCookie(token));
    console.warn('⚠️  Logged in with dev fallback password. Set ADMIN_PASSWORD_HASH before deploying.');
    return response;
  }

  const valid = await bcrypt.compare(parsed.data.password, hash);
  if (!valid) {
    // Same generic message for invalid password — don't leak which field was wrong
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signAdminJWT();
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', buildSessionCookie(token));
  return response;
}
