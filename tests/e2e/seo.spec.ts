/**
 * seo.spec.ts
 *
 * Guard rails P4 and P5 — the crawler-facing surfaces work over real HTTP.
 *
 * Everything here asserts against the RAW RESPONSE BODY, never the DOM. That
 * distinction is the whole point of this file. A React test and the browser
 * devtools both show content that JavaScript injected on hydration, so both
 * would pass for a page that is completely empty to a crawler — which is
 * exactly the state the blog was in for its entire existence. The only thing
 * that can prove otherwise is reading the bytes the server sent.
 *
 * Run against a preview deployment before promoting:
 *   PLAYWRIGHT_BASE_URL=<preview-url> npm run test:e2e
 */

import { test, expect } from '@playwright/test';

import { BLOG_INDEXABLE } from '../../src/lib/blog/visibility';

/** Strips tags so the remaining text is what a non-executing crawler sees. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test.describe('P4 — the crawler-facing files are served', () => {
  for (const [path, type] of [
    ['/robots.txt', /text\/plain/],
    ['/sitemap.xml', /xml/],
    ['/llms.txt', /text\/plain/],
    ['/llms-full.txt', /text\/plain/],
  ] as const) {
    test(`${path} returns 200 with the right content type`, async ({ request }) => {
      const response = await request.get(path);

      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type'] ?? '', path).toMatch(type);
      expect((await response.text()).length, `${path} is empty`).toBeGreaterThan(100);
    });
  }

  test('llms.txt still serves when the database is having a bad day', async ({ request }) => {
    // Not simulable from here, but the narrative sections come from constants
    // and must be present regardless of what any data source did.
    const body = await (await request.get('/llms.txt')).text();

    expect(body).toContain('# Antonio Luis Santos');
    expect(body).toContain('## Common questions');
  });

  test('robots.txt points at the sitemap and keeps the admin area out', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();

    expect(body).toMatch(/Sitemap:\s*https:\/\//i);
    expect(body).toContain('/edit/');
  });

  test('every URL in the sitemap resolves', async ({ request }) => {
    // A sitemap advertising dead pages wastes crawl budget and teaches the
    // crawler to trust it less.
    const xml = await (await request.get('/sitemap.xml')).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      const response = await request.get(url, { maxRedirects: 5 });
      expect(response.status(), url).toBe(200);
    }
  });

  test('the sitemap and the robots directives agree about the blog', async ({ request }) => {
    // A sitemap listing URLs that carry noindex is a contradiction crawlers
    // notice. Both are driven by BLOG_INDEXABLE precisely so they cannot drift.
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml.includes('/blog/')).toBe(BLOG_INDEXABLE);
  });
});

test.describe('P5 — content is in the HTML, not injected by JavaScript', () => {
  test('the home page carries its own text without scripts running', async ({ request }) => {
    const text = visibleText(await (await request.get('/')).text());

    expect(text).toContain('Antonio Luis Santos');
    // The FAQ answers are the highest-intent copy on the site and the part an
    // assistant is most likely to quote.
    expect(text.split(' ').length).toBeGreaterThan(300);
  });

  test('a case study renders its prose server-side', async ({ request }) => {
    const text = visibleText(await (await request.get('/work/relay')).text());
    expect(text.split(' ').length).toBeGreaterThan(100);
  });

  test('the blog index renders server-side', async ({ request }) => {
    const response = await request.get('/blog');
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(visibleText(html)).toContain('Writing');
    // The Blog JSON-LD is in the server HTML, not added on hydration.
    expect(html).toContain('application/ld+json');
  });

  test('a published post renders its body with no JavaScript', async ({ request }) => {
    // The single most important assertion in the suite: it is the only check
    // that distinguishes "the blog works" from "the blog is invisible", which
    // is the difference this whole change set exists to close.
    const xml = await (await request.get('/sitemap.xml')).text();
    const url = [...xml.matchAll(/<loc>([^<]+\/blog\/[^<]+)<\/loc>/g)].map(m => m[1])[0];

    test.skip(!url, 'no published post URLs yet — expected while BLOG_INDEXABLE is false');

    const html = await (await request.get(url!)).text();
    const text = visibleText(html);

    expect(text.split(' ').length).toBeGreaterThan(200);
    expect(html).toContain('BlogPosting');
  });

  test('an unknown post is a 404, not a 200 and not a 500', async ({ request }) => {
    const response = await request.get('/blog/definitely-not-a-real-post', {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(404);
  });
});

test.describe('canonicals point at the page you are on', () => {
  for (const path of ['/', '/work', '/work/relay', '/website-workflow', '/blog']) {
    test(`${path} canonicalises to itself`, async ({ request }) => {
      // layout.tsx sets a site-wide canonical and Next merges metadata
      // shallowly, so any route that forgets its own silently claims to be a
      // duplicate of the home page. That is invisible in a browser.
      const html = await (await request.get(path)).text();
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];

      expect(canonical, `${path} has no canonical`).toBeTruthy();

      const expected = path === '/' ? '' : path;
      expect(new URL(canonical!).pathname.replace(/\/$/, ''), path).toBe(expected);
    });
  }
});
