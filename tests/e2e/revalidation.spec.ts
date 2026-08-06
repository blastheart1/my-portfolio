/**
 * revalidation.spec.ts
 *
 * Guard rail P3 — an admin save still propagates to the home page.
 *
 * This is the single most important end-to-end check in the suite. Removing
 * `force-dynamic` from src/app/page.tsx made / statically cached, which is what
 * finally gives the eleven existing revalidatePath('/') calls something to
 * invalidate. The unit test only proves those calls exist in the source; only a
 * real round trip proves the page actually updates.
 *
 * If this fails, / is serving stale content and the caching change must be
 * revisited — do not "fix" it by reinstating force-dynamic, which would make
 * the site slower AND return the invalidation to being a no-op.
 */

import { test, expect } from '@playwright/test';

const UNIQUE = `E2E revalidate ${Date.now()}`;

test.describe('P3 — admin edits reach the cached home page', () => {
  let createdId: string | undefined;

  test.afterEach(async ({ request }) => {
    if (createdId) {
      await request.delete(`/api/admin/projects/${createdId}`, {
        failOnStatusCode: false,
      });
      createdId = undefined;
    }
  });

  test('a new project appears on / after being created', async ({ request, page }) => {
    // Create through the same API the admin UI uses.
    const created = await request.post('/api/admin/projects', {
      data: {
        title: UNIQUE,
        description: 'Created by the revalidation E2E spec.',
        tech: ['playwright'],
        sort_order: 0,
        visible: true,
      },
    });
    expect(created.status()).toBe(201);

    const body = await created.json();
    createdId = body.id;
    expect(createdId, 'API should return the new row id').toBeTruthy();

    // The POST handler calls revalidatePath('/'), so a fresh load should show
    // it without waiting for the revalidate floor to elapse.
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(
      page.getByText(UNIQUE, { exact: false }),
      'Project created via the admin API did not appear on / — revalidatePath ' +
        'is not invalidating the cached page.'
    ).toBeVisible({ timeout: 15_000 });
  });

  test('an edit to that project is reflected on /', async ({ request, page }) => {
    const created = await request.post('/api/admin/projects', {
      data: { title: `${UNIQUE} original`, visible: true, sort_order: 0 },
    });
    expect(created.status()).toBe(201);
    createdId = (await created.json()).id;

    const renamed = `${UNIQUE} renamed`;
    const patched = await request.patch(`/api/admin/projects/${createdId}`, {
      data: { title: renamed },
    });
    expect(patched.status()).toBeLessThan(400);

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByText(renamed, { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('a deleted project disappears from /', async ({ request, page }) => {
    const created = await request.post('/api/admin/projects', {
      data: { title: `${UNIQUE} doomed`, visible: true, sort_order: 0 },
    });
    const id = (await created.json()).id;

    const deleted = await request.delete(`/api/admin/projects/${id}`);
    expect(deleted.status()).toBeLessThan(400);
    createdId = undefined; // already gone

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(
      page.getByText(`${UNIQUE} doomed`, { exact: false })
    ).toHaveCount(0);
  });
});

test.describe('the home page still renders its core sections', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders for an anonymous visitor', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('#home')).toBeVisible();
  });

  test('does not eagerly download the TensorFlow chunk (N9)', async ({ page }) => {
    const jsRequests: string[] = [];
    page.on('request', req => {
      if (req.resourceType() === 'script') jsRequests.push(req.url());
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // The tfjs chunk is ~1.1 MB. Nothing on first paint should pull it.
    const responses = await Promise.all(
      jsRequests.slice(0, 60).map(async url => {
        try {
          const r = await page.request.get(url, { failOnStatusCode: false });
          return (await r.body()).includes(Buffer.from('tfjs'));
        } catch {
          return false;
        }
      })
    );

    expect(
      responses.some(Boolean),
      'A script loaded on first paint contains TensorFlow — the lazy boundary ' +
        'in PortfolioChatbotWrapper has regressed.'
    ).toBe(false);
  });
});
