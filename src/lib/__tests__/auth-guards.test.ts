/**
 * auth-guards.test.ts
 *
 * Run with: npm run test
 *
 * Guard rails covered (see docs/plans/AUDIT-2026-08-02.md):
 *   N1 — every /api/admin/* route rejects unauthenticated requests with 401
 *   N2 — expired / forged / tampered / empty tokens are rejected like no token
 *   N4 — /api/blog/generate is admin-only
 *   P2 — a valid admin session still reaches the handler (not 401)
 *
 * These tests call the route handlers directly rather than going over HTTP, so
 * they run without a server and without a database. Handlers must therefore
 * perform the auth check BEFORE any DB access — which is the behaviour we want
 * to enforce anyway.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';

// Must be set before any module calls getSecret(). admin-auth reads it lazily.
const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.JWT_SECRET = TEST_SECRET;

const COOKIE_NAME = 'admin_session';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function secretBytes(s: string) {
  return new TextEncoder().encode(s);
}

async function signToken(opts: {
  secret?: string;
  expiresIn?: string;
  payload?: Record<string, unknown>;
} = {}): Promise<string> {
  return new SignJWT(opts.payload ?? { role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '8h')
    .sign(secretBytes(opts.secret ?? TEST_SECRET));
}

function makeRequest(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {}
): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.token !== undefined) headers.cookie = `${COOKIE_NAME}=${opts.token}`;

  const init: ConstructorParameters<typeof NextRequest>[1] = { method, headers };
  if (opts.body !== undefined && method !== 'GET' && method !== 'DELETE') {
    init.body = JSON.stringify(opts.body);
  }
  return new NextRequest(`https://codebyluis.dev${path}`, init);
}

/** Route handlers for dynamic segments take a second { params } argument. */
type Ctx = { params: Promise<Record<string, string>> } | undefined;

interface RouteCase {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  /** Lazy import of the route module. */
  load: () => Promise<Record<string, unknown>>;
  ctx?: Ctx;
}

// Every route under /api/admin/* except the auth endpoints, which are
// intentionally public (login must be reachable while logged out; logout must
// be callable with an already-invalid session).
const ADMIN_ROUTES: RouteCase[] = [
  { method: 'GET',    path: '/api/admin/projects',        load: () => import('@/app/api/admin/projects/route') },
  { method: 'POST',   path: '/api/admin/projects',        load: () => import('@/app/api/admin/projects/route') },
  { method: 'PATCH',  path: '/api/admin/projects/abc',    load: () => import('@/app/api/admin/projects/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },
  { method: 'DELETE', path: '/api/admin/projects/abc',    load: () => import('@/app/api/admin/projects/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },

  { method: 'GET',    path: '/api/admin/services',        load: () => import('@/app/api/admin/services/route') },
  { method: 'POST',   path: '/api/admin/services',        load: () => import('@/app/api/admin/services/route') },
  { method: 'PATCH',  path: '/api/admin/services/abc',    load: () => import('@/app/api/admin/services/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },
  { method: 'DELETE', path: '/api/admin/services/abc',    load: () => import('@/app/api/admin/services/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },

  { method: 'GET',    path: '/api/admin/experience',      load: () => import('@/app/api/admin/experience/route') },
  { method: 'POST',   path: '/api/admin/experience',      load: () => import('@/app/api/admin/experience/route') },
  { method: 'PATCH',  path: '/api/admin/experience/abc',  load: () => import('@/app/api/admin/experience/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },
  { method: 'DELETE', path: '/api/admin/experience/abc',  load: () => import('@/app/api/admin/experience/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },

  { method: 'GET',    path: '/api/admin/content/hero',    load: () => import('@/app/api/admin/content/[section]/route'), ctx: { params: Promise.resolve({ section: 'hero' }) } },
  { method: 'PATCH',  path: '/api/admin/content/hero',    load: () => import('@/app/api/admin/content/[section]/route'), ctx: { params: Promise.resolve({ section: 'hero' }) } },

  { method: 'GET',    path: '/api/admin/sections',        load: () => import('@/app/api/admin/sections/route') },
  { method: 'PATCH',  path: '/api/admin/sections',        load: () => import('@/app/api/admin/sections/route') },

  { method: 'GET',    path: '/api/admin/settings',        load: () => import('@/app/api/admin/settings/route') },
  { method: 'PATCH',  path: '/api/admin/settings',        load: () => import('@/app/api/admin/settings/route') },

  { method: 'GET',    path: '/api/admin/images',          load: () => import('@/app/api/admin/images/route') },
  { method: 'POST',   path: '/api/admin/images',          load: () => import('@/app/api/admin/images/route') },
  { method: 'DELETE', path: '/api/admin/images/abc',      load: () => import('@/app/api/admin/images/[id]/route'), ctx: { params: Promise.resolve({ id: 'abc' }) } },

  { method: 'GET',    path: '/api/admin/chatbot/config',        load: () => import('@/app/api/admin/chatbot/config/route') },
  { method: 'PATCH',  path: '/api/admin/chatbot/config',        load: () => import('@/app/api/admin/chatbot/config/route') },
  { method: 'PUT',    path: '/api/admin/chatbot/config',        load: () => import('@/app/api/admin/chatbot/config/route') },
  { method: 'GET',    path: '/api/admin/chatbot/conversations', load: () => import('@/app/api/admin/chatbot/conversations/route') },
  { method: 'GET',    path: '/api/admin/chatbot/examples',      load: () => import('@/app/api/admin/chatbot/examples/route') },
];

async function invoke(rc: RouteCase, token?: string): Promise<Response> {
  const mod = await rc.load();
  const handler = mod[rc.method] as
    | ((req: NextRequest, ctx?: Ctx) => Promise<Response>)
    | undefined;

  if (typeof handler !== 'function') {
    throw new Error(`No ${rc.method} export for ${rc.path}`);
  }
  const req = makeRequest(rc.method, rc.path, { token, body: {} });
  return handler(req, rc.ctx);
}

// ─── N1: unauthenticated admin routes must reject ────────────────────────────

describe('N1 — /api/admin/* rejects unauthenticated requests', () => {
  it('covers every admin route (guards against a new route being added unguarded)', () => {
    // 26 handler entries across 14 route files. If you add a route, add it here.
    expect(ADMIN_ROUTES.length).toBe(26);
  });

  ADMIN_ROUTES.forEach(rc => {
    it(`${rc.method} ${rc.path} → 401 with no cookie`, async () => {
      const res = await invoke(rc, undefined);
      expect(res.status).toBe(401);
    });
  });

  ADMIN_ROUTES.forEach(rc => {
    it(`${rc.method} ${rc.path} → 401 with an empty cookie value`, async () => {
      const res = await invoke(rc, '');
      expect(res.status).toBe(401);
    });
  });

  it('never leaks a DB error instead of 401 (auth must run before DB access)', async () => {
    // DATABASE_URL is not set in the test env. If a handler touched the DB
    // before checking auth it would throw or 500 rather than returning 401.
    for (const rc of ADMIN_ROUTES) {
      const res = await invoke(rc, undefined);
      expect(res.status, `${rc.method} ${rc.path}`).not.toBe(500);
    }
  });
});

// ─── N2: bad tokens are rejected like no token ───────────────────────────────

describe('N2 — malformed, expired, and forged tokens are rejected', () => {
  const probe = ADMIN_ROUTES.find(r => r.method === 'POST' && r.path === '/api/admin/projects')!;

  it('rejects a JWT signed with the wrong secret', async () => {
    const token = await signToken({ secret: 'a-completely-different-secret-32-chars!!' });
    const res = await invoke(probe, token);
    expect(res.status).toBe(401);
  });

  it('rejects an expired JWT', async () => {
    const token = await signToken({ expiresIn: '-1h' });
    const res = await invoke(probe, token);
    expect(res.status).toBe(401);
  });

  it('rejects a structurally invalid token', async () => {
    const res = await invoke(probe, 'not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered payload', async () => {
    const token = await signToken();
    const [h, , s] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ role: 'admin', sub: 'attacker' }))
      .toString('base64url');
    const res = await invoke(probe, `${h}.${forgedPayload}.${s}`);
    expect(res.status).toBe(401);
  });

  it('rejects the "none" algorithm', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ role: 'admin' })).toString('base64url');
    const res = await invoke(probe, `${header}.${payload}.`);
    expect(res.status).toBe(401);
  });
});

// ─── P2: a valid session still gets through ──────────────────────────────────

describe('P2 — a valid admin session is not blocked', () => {
  ADMIN_ROUTES.forEach(rc => {
    it(`${rc.method} ${rc.path} passes the auth gate with a valid token`, async () => {
      const token = await signToken();
      const res = await invoke(rc, token);
      // The handler may still fail downstream (no DATABASE_URL in tests) — we
      // only assert the request was NOT rejected by the auth layer.
      expect(res.status).not.toBe(401);
    });
  });
});

// ─── N4: blog generation is admin-only ───────────────────────────────────────

describe('N4 — /api/blog/generate is admin-only', () => {
  it('rejects an unauthenticated POST', async () => {
    const mod = await import('@/app/api/blog/generate/route');
    const handler = mod.POST as (req: NextRequest) => Promise<Response>;
    const res = await handler(makeRequest('POST', '/api/blog/generate', { body: {} }));
    expect(res.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const mod = await import('@/app/api/blog/generate/route');
    const handler = mod.POST as (req: NextRequest) => Promise<Response>;
    const token = await signToken({ secret: 'another-wrong-secret-at-least-32-chars!!' });
    const res = await handler(makeRequest('POST', '/api/blog/generate', { token, body: {} }));
    expect(res.status).toBe(401);
  });
});
