/**
 * blog-revalidation.spec.ts
 *
 * Guard rail P7 — a generated post reaches its own URL and the index without
 * waiting out the revalidate floor.
 *
 * Mirrors P3 in revalidation.spec.ts, which proves the same thing for an admin
 * edit reaching the cached home page. The unit tests prove the write routes
 * CALL revalidatePath; only a real round trip proves the pages actually update.
 *
 * ── Opt-in, deliberately ─────────────────────────────────────────────────────
 * This spends real provider budget (a draft, an audit, several link checks)
 * and writes a real row to the production Supabase table. It runs only with
 * RUN_BLOG_E2E=1, and it deletes what it created. The teardown is why
 * deleteBlogPost exists: without it every run would leave a post behind.
 *
 *   RUN_BLOG_E2E=1 npm run test:e2e -- blog-revalidation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '@playwright/test';

const ENABLED = process.env.RUN_BLOG_E2E === '1';

test.describe('P7 — a new post is reachable immediately', () => {
  test.skip(
    !ENABLED,
    'Opt-in: spends provider budget and writes to the live table. Set RUN_BLOG_E2E=1.'
  );

  let createdId: string | undefined;

  test.afterEach(async ({ request }) => {
    if (!createdId) return;

    // Through the admin API, the same way the projects spec cleans up.
    await request.delete(`/api/admin/blog/${createdId}`, { failOnStatusCode: false });
    createdId = undefined;
  });

  test('a generated post gets a URL, and the index lists it', async ({ request }) => {
    const response = await request.post('/api/blog/generate', { data: {} });
    expect(response.status()).toBe(200);

    const body = await response.json();

    // A rejection is a legitimate outcome — the gate exists to produce them —
    // so it is reported rather than failed. What must never happen is a
    // published post that is unreachable.
    if (!body.published) {
      test.info().annotations.push({
        type: 'gate',
        description: `Draft rejected: ${(body.reasons ?? []).join('; ')}`,
      });
      return;
    }

    createdId = body.post?.id;
    const slug = body.post?.slug;
    expect(slug, 'a published post must carry a slug').toBeTruthy();

    // No waiting: the write path calls revalidatePath before returning.
    const post = await request.get(`/blog/${slug}`);
    expect(post.status()).toBe(200);

    const index = await request.get('/blog');
    expect(await index.text()).toContain(slug);
  });

  test('a rejected draft writes nothing at all', async ({ request }) => {
    // The gate's contract: reject means no row, not a hidden row.
    const response = await request.post('/api/blog/generate', {
      data: { topic: 'x'.repeat(200), type: 'case-study' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    if (!body.published) {
      expect(body.post).toBeUndefined();
      expect(Array.isArray(body.reasons)).toBe(true);
      expect(body.reasons.length).toBeGreaterThan(0);
    } else {
      createdId = body.post?.id;
    }
  });
});
