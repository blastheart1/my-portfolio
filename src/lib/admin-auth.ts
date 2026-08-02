import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'admin_session';
const JWT_EXPIRY = '8h';

/**
 * Constant-time string comparison for shared secrets (CRON_SECRET, bearer
 * tokens). A plain `!==` leaks how many leading characters matched via timing,
 * which is enough to recover a secret byte-by-byte given enough requests.
 *
 * Returns false when either side is missing, so an unset env var can never
 * authenticate a request.
 */
export function timingSafeCompare(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // timingSafeEqual throws on length mismatch, so compare lengths first. The
  // length of a secret is not itself sensitive.
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return new TextEncoder().encode(secret);
}

export async function signAdminJWT(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifyAdminJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

export function buildSessionCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 8 * 60 * 60; // 8 hours in seconds
  return [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Strict',
    isProduction ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

export { COOKIE_NAME };
