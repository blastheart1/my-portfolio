/**
 * sitemap.test.ts
 *
 * Guard rail:
 *   N19 — sitemap() must resolve with its static entries intact when database
 *         credentials are absent, and must export a revalidate floor
 *
 * The credential case is not theoretical. `next build` executes this function,
 * CI runs that build with no Supabase or Neon environment, and both data
 * layers swallow their own errors. So there are two ways to get this wrong and
 * they fail in opposite directions: an unguarded read makes the build fail in
 * CI only, and a guarded one lets CI pass while silently producing a sitemap
 * missing every dynamic URL. Production has the variables, so nobody notices
 * until they are rotated.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SITE_URL } from '@/lib/site';

const isDemoVisible = vi.fn();
const getPublishedBlogSlugs = vi.fn();

vi.mock('@/lib/content-queries', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/content-queries')>()),
  isDemoVisible: (id: string) => isDemoVisible(id),
}));

vi.mock('@/lib/database', () => ({
  getPublishedBlogSlugs: () => getPublishedBlogSlugs(),
}));

import sitemap, { revalidate } from '../sitemap';
import { BLOG_INDEXABLE } from '@/lib/blog/visibility';

const APP = path.resolve(__dirname, '..');

beforeEach(() => {
  vi.clearAllMocks();
  isDemoVisible.mockResolvedValue(true);
  getPublishedBlogSlugs.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function urls(entries: { url: string }[]): string[] {
  return entries.map(entry => entry.url);
}

describe('the static spine', () => {
  it('always lists the home page, /work and /website-workflow', async () => {
    const entries = await sitemap();

    expect(urls(entries)).toEqual(
      expect.arrayContaining([SITE_URL, `${SITE_URL}/work`, `${SITE_URL}/website-workflow`])
    );
  });

  it('lists a case study only while its section is visible', async () => {
    isDemoVisible.mockResolvedValue(false);

    const entries = await sitemap();

    expect(urls(entries).some(url => url.includes('/work/'))).toBe(false);
    // The index itself stays: it is always reachable.
    expect(urls(entries)).toContain(`${SITE_URL}/work`);
  });

  it('never lists a section anchor, which is not a separate document', async () => {
    const entries = await sitemap();
    expect(urls(entries).some(url => url.includes('#'))).toBe(false);
  });

  it('gives every entry an absolute https URL on the real domain', async () => {
    for (const entry of await sitemap()) {
      expect(entry.url.startsWith(`${SITE_URL}/`) || entry.url === SITE_URL).toBe(true);
    }
  });
});

describe('N19 — it survives a build with no database credentials', () => {
  it('resolves rather than rejecting when the blog read fails', async () => {
    // What CI actually does: no NEXT_PUBLIC_SUPABASE_* at all. The read
    // swallows it and returns [].
    getPublishedBlogSlugs.mockResolvedValue([]);
    isDemoVisible.mockResolvedValue(false);

    const entries = await sitemap();

    expect(entries.length).toBeGreaterThan(0);
    expect(urls(entries)).toContain(SITE_URL);
  });

  it('still resolves if a data source rejects outright', async () => {
    getPublishedBlogSlugs.mockRejectedValue(new Error('Supabase is not configured'));
    isDemoVisible.mockResolvedValue(true);

    // Only meaningful once blog URLs are switched on; asserted either way so
    // the protection is already in place when they are.
    if (BLOG_INDEXABLE) {
      await expect(sitemap()).resolves.toBeDefined();
    } else {
      expect(await sitemap()).toBeDefined();
    }
  });

  it('declares a revalidate floor, so it is not frozen at build time', () => {
    // Without this the sitemap is generated once per deploy. The content cron
    // runs every two days and pings IndexNow immediately, so a build-time
    // sitemap would disagree with what has already been submitted.
    expect(typeof revalidate).toBe('number');
    expect(revalidate).toBeGreaterThan(0);
  });

  it('derives its origin from SITE_URL rather than hardcoding one', () => {
    const src = readFileSync(path.join(APP, 'sitemap.ts'), 'utf8');

    expect(src).toMatch(/from ['"]@\/lib\/site['"]/);
    expect(src).not.toMatch(/https?:\/\/[a-z]+\.dev/);
  });
});

describe('blog URLs are gated by one switch', () => {
  const slugs = [
    { slug: 'rules-and-models', updatedAt: new Date('2026-09-10T00:00:00.000Z') },
    { slug: 'test-strategy', updatedAt: new Date('2026-08-01T00:00:00.000Z') },
  ];

  it('matches BLOG_INDEXABLE, so the sitemap can never advertise a noindex URL', async () => {
    getPublishedBlogSlugs.mockResolvedValue(slugs);

    const listed = urls(await sitemap()).some(url => url.includes('/blog'));

    expect(listed).toBe(BLOG_INDEXABLE);
  });

  it('does not even ask the database while the blog is switched off', async () => {
    if (BLOG_INDEXABLE) return;

    await sitemap();

    expect(getPublishedBlogSlugs).not.toHaveBeenCalled();
  });

  it('uses each row’s real updated_at once switched on', async () => {
    if (!BLOG_INDEXABLE) return;

    getPublishedBlogSlugs.mockResolvedValue(slugs);
    const entries = await sitemap();
    const entry = entries.find(item => item.url.endsWith('/blog/rules-and-models'));

    // A sitemap that stamps the build time on every URL claims everything
    // changed on every deploy, and that signal stops being read.
    expect(entry?.lastModified).toEqual(new Date('2026-09-10T00:00:00.000Z'));
  });
});
