/**
 * admin-auth.spec.ts
 *
 * Guard rails:
 *   N1 — unauthenticated requests to /api/admin/* return 401 over real HTTP
 *   P1 — an authenticated admin can still reach every /edit page
 *
 * The unit suite (src/lib/__tests__/auth-guards.test.ts) calls the handlers
 * directly. This exercises the full stack — proxy matcher included — which is
 * the layer a handler-level test cannot reach.
 */

import { test, expect } from '@playwright/test';

/** Every mutating admin endpoint, plus the read endpoints that leak data. */
const PROTECTED: Array<{ method: 'get' | 'post' | 'patch' | 'put' | 'delete'; path: string }> = [
  { method: 'get',    path: '/api/admin/projects' },
  { method: 'post',   path: '/api/admin/projects' },
  { method: 'patch',  path: '/api/admin/projects/00000000-0000-0000-0000-000000000000' },
  { method: 'delete', path: '/api/admin/projects/00000000-0000-0000-0000-000000000000' },
  { method: 'get',    path: '/api/admin/services' },
  { method: 'post',   path: '/api/admin/services' },
  { method: 'get',    path: '/api/admin/experience' },
  { method: 'post',   path: '/api/admin/experience' },
  { method: 'get',    path: '/api/admin/content/hero' },
  { method: 'patch',  path: '/api/admin/content/hero' },
  { method: 'get',    path: '/api/admin/sections' },
  { method: 'patch',  path: '/api/admin/sections' },
  { method: 'get',    path: '/api/admin/settings' },
  { method: 'patch',  path: '/api/admin/settings' },
  { method: 'get',    path: '/api/admin/images' },
  { method: 'get',    path: '/api/admin/chatbot/config' },
  { method: 'patch',  path: '/api/admin/chatbot/config' },
  { method: 'get',    path: '/api/admin/chatbot/conversations' },
  { method: 'get',    path: '/api/admin/chatbot/examples' },
];

test.describe('N1 — admin API rejects anonymous callers', () => {
  // Explicitly drop the stored admin session for this block.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const { method, path } of PROTECTED) {
    test(`${method.toUpperCase()} ${path} → 401`, async ({ request }) => {
      const res = await request[method](path, {
        data: method === 'get' || method === 'delete' ? undefined : {},
        failOnStatusCode: false,
      });
      expect(res.status(), `${method.toUpperCase()} ${path}`).toBe(401);
    });
  }

  test('a forged session cookie is rejected', async ({ request }) => {
    const res = await request.get('/api/admin/projects', {
      headers: { cookie: 'admin_session=not.a.real.token' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });

  test('/edit redirects to the login page', async ({ page }) => {
    await page.goto('/edit/projects');
    await expect(page).toHaveURL(/\/edit\/login/);
  });

  test('/api/blog/generate is not publicly callable', async ({ request }) => {
    const res = await request.post('/api/blog/generate', {
      data: {},
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('P1 — an authenticated admin still has full access', () => {
  const PAGES = [
    '/edit',
    '/edit/sections',
    '/edit/projects',
    '/edit/services',
    '/edit/experience',
    '/edit/images',
    '/edit/chatbot',
    '/edit/content/hero',
  ];

  for (const path of PAGES) {
    test(`loads ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      // Must not have been bounced to login.
      await expect(page).not.toHaveURL(/\/edit\/login/);
    });
  }

  test('can read the projects API with a session', async ({ request }) => {
    const res = await request.get('/api/admin/projects');
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});
