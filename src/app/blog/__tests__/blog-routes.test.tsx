/**
 * blog-routes.test.tsx
 *
 * Guard rails:
 *   N12 — blog content may never reach the DOM via dangerouslySetInnerHTML
 *   N18 — /blog/[slug] may never 500; an unreachable database produces a 404
 *         or an empty state, and the route may never set dynamicParams = false
 *
 * Plus the canonical assertions behind N9, which are the reason this whole
 * section is worth shipping. A generateMetadata that returns only a title and
 * description inherits the ROOT layout's canonical — the home page — and tells
 * Google every post is a duplicate of /. That failure is invisible in the
 * browser and would quietly collapse the section, so it is asserted here as
 * "not SITE_URL" rather than merely "is a string".
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { readCode } from '@/lib/__tests__/support/source';
import { SITE_URL } from '@/lib/site';
import type { BlogPost } from '@/types/blog';

const getBlogPostBySlug = vi.fn();
const getBlogPosts = vi.fn();
const getPublishedBlogPostCount = vi.fn();

vi.mock('@/lib/database', () => ({
  getBlogPostBySlug: (slug: string) => getBlogPostBySlug(slug),
  getBlogPosts: (limit: number, offset: number) => getBlogPosts(limit, offset),
  getPublishedBlogPostCount: () => getPublishedBlogPostCount(),
}));

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound: () => notFound() }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import BlogPostPage, { generateMetadata as postMetadata } from '../[slug]/page';
import BlogIndexPage, { generateMetadata as indexMetadata } from '../page';

const ROUTES = path.resolve(__dirname, '..');

/** Source with comments removed — see the helper's docblock for why. */
function code(relativePath: string): string {
  return readCode(path.join(ROUTES, relativePath));
}

function post(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'row-1',
    slug: 'rules-and-models',
    title: 'Choosing Between Rules And Models',
    content: 'First paragraph.\n\nSecond paragraph.',
    excerpt: 'Some decisions belong in rules and some need a model.',
    type: 'blog',
    topic: 'Decision Automation',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-10T00:00:00.000Z'),
    published: true,
    ...overrides,
  };
}

async function renderPage(element: Promise<React.ReactElement>) {
  render(await element);
}

const params = (slug: string) => Promise.resolve({ slug });
const searchParams = (query: Record<string, string> = {}) => Promise.resolve(query);

beforeEach(() => {
  vi.clearAllMocks();
  getBlogPosts.mockResolvedValue([post()]);
  getPublishedBlogPostCount.mockResolvedValue(1);
  getBlogPostBySlug.mockResolvedValue(post());
});

describe('N9 — every blog route sets its own canonical', () => {
  it('a post canonicalises to its own URL, not the home page', async () => {
    const meta = await postMetadata({ params: params('rules-and-models') });

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/blog/rules-and-models`);
    // The failure mode, stated explicitly: inheriting the root's canonical.
    expect(meta.alternates?.canonical).not.toBe(SITE_URL);
  });

  it('the index canonicalises to /blog', async () => {
    const meta = await indexMetadata({ searchParams: searchParams() });

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/blog`);
    expect(meta.alternates?.canonical).not.toBe(SITE_URL);
  });

  it('a later index page canonicalises to itself rather than to page one', async () => {
    const meta = await indexMetadata({ searchParams: searchParams({ page: '3' }) });

    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/blog?page=3`);
  });

  it('describes a post as an article, with its real dates', async () => {
    const meta = await postMetadata({ params: params('rules-and-models') });

    expect(meta.openGraph).toMatchObject({ type: 'article' });
    expect(meta.title).toBe('Choosing Between Rules And Models');
    expect(meta.description).toBe('Some decisions belong in rules and some need a model.');
  });

  it('returns empty metadata for an unknown slug rather than inventing one', async () => {
    getBlogPostBySlug.mockResolvedValue(null);

    await expect(postMetadata({ params: params('nope') })).resolves.toEqual({});
  });
});

describe('N18 — a missing post is a 404, never a 500', () => {
  it('404s an unknown slug', async () => {
    getBlogPostBySlug.mockResolvedValue(null);

    await expect(BlogPostPage({ params: params('nope') })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('404s when the database is unreachable', async () => {
    // getBlogPostBySlug swallows its own errors and returns null, so an outage
    // is indistinguishable from a missing post here. That is deliberate: a
    // crawler retries a 500 and simply drops a 404.
    getBlogPostBySlug.mockResolvedValue(null);

    await expect(BlogPostPage({ params: params('rules-and-models') })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('renders an empty index rather than failing when there are no posts', async () => {
    getBlogPosts.mockResolvedValue([]);
    getPublishedBlogPostCount.mockResolvedValue(0);

    await renderPage(BlogIndexPage({ searchParams: searchParams() }));

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/nothing published here just yet/i)).toBeInTheDocument();
  });

  it('never declares dynamicParams = false', () => {
    // Paired with params that come from Supabase, that would 404 every
    // cron-written post until the next deploy and cache the 404 on the way.
    const src = code('[slug]/page.tsx');

    expect(src).not.toMatch(/dynamicParams\s*=\s*false/);
    expect(src, 'the route needs a revalidate floor instead').toMatch(
      /export\s+const\s+revalidate\s*=\s*\d+/
    );
  });

  it('does not use generateStaticParams, whose param source is a live database', () => {
    expect(code('[slug]/page.tsx')).not.toContain('generateStaticParams');
  });
});

describe('the post renders as crawlable HTML', () => {
  it('renders the title as the h1 and the body as text', async () => {
    await renderPage(BlogPostPage({ params: params('rules-and-models') }));

    expect(
      screen.getByRole('heading', { name: 'Choosing Between Rules And Models', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
  });

  it('converts the legacy JSON body shape into readable paragraphs', async () => {
    getBlogPostBySlug.mockResolvedValue(
      post({
        content: JSON.stringify({
          introduction: 'The opening.',
          body: ['The middle.'],
          conclusion: 'The close.',
        }),
      })
    );

    await renderPage(BlogPostPage({ params: params('rules-and-models') }));

    expect(screen.getByText('The opening.')).toBeInTheDocument();
    expect(screen.getByText('The middle.')).toBeInTheDocument();
    expect(screen.getByText('The close.')).toBeInTheDocument();
  });

  it('emits BlogPosting JSON-LD naming the author by @id', async () => {
    const { container } = render(await BlogPostPage({ params: params('rules-and-models') }));

    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')];
    const nodes = scripts.flatMap(script => JSON.parse(script.textContent ?? '{}')['@graph'] ?? []);
    const posting = nodes.find((node: { '@type'?: string }) => node['@type'] === 'BlogPosting');

    expect(posting).toBeDefined();
    expect(posting.url).toBe(`${SITE_URL}/blog/rules-and-models`);
    expect(posting.headline).toBe('Choosing Between Rules And Models');
    // Real row timestamps, not the build time.
    expect(posting.datePublished).toBe('2026-09-01T00:00:00.000Z');
    expect(posting.dateModified).toBe('2026-09-10T00:00:00.000Z');
    expect(posting.author).toEqual({ '@id': `${SITE_URL}/#person` });
  });

  it('emits a breadcrumb trail ending at the post', async () => {
    const { container } = render(await BlogPostPage({ params: params('rules-and-models') }));

    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')];
    const breadcrumb = scripts
      .map(script => JSON.parse(script.textContent ?? '{}'))
      .find(data => data['@type'] === 'BreadcrumbList');

    expect(breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual([
      'Home',
      'Writing',
      'Choosing Between Rules And Models',
    ]);
  });

  it('links each index card to the post’s own URL', async () => {
    await renderPage(BlogIndexPage({ searchParams: searchParams() }));

    expect(screen.getByRole('link', { name: /Choosing Between Rules And Models/ })).toHaveAttribute(
      'href',
      '/blog/rules-and-models'
    );
  });

  it('omits a post that has no slug rather than linking nowhere', async () => {
    getBlogPosts.mockResolvedValue([post({ slug: undefined })]);

    await renderPage(BlogIndexPage({ searchParams: searchParams() }));

    expect(screen.queryByText('Choosing Between Rules And Models')).not.toBeInTheDocument();
  });
});

describe('N12 — model-written content is never injected as markup', () => {
  it('renders a script tag in the body as text, not as an element', async () => {
    getBlogPostBySlug.mockResolvedValue(
      post({ content: '<script>alert(1)</script>\n\nOrdinary prose.' })
    );

    const { container } = render(await BlogPostPage({ params: params('rules-and-models') }));

    // The JSON-LD script is ours and expected; no other script may exist.
    const injected = [...container.querySelectorAll('script')].filter(
      node => node.getAttribute('type') !== 'application/ld+json'
    );
    expect(injected).toHaveLength(0);
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('renders an img onerror payload from the legacy JSON shape as text', async () => {
    getBlogPostBySlug.mockResolvedValue(
      post({ content: JSON.stringify({ introduction: '<img src=x onerror="alert(1)">' }) })
    );

    const { container } = render(await BlogPostPage({ params: params('rules-and-models') }));

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('onerror');
  });

  it('neither blog route calls dangerouslySetInnerHTML on post content', () => {
    // The pages do use it for the JSON-LD script, which is our own serialised
    // object and never user or model input. What must never appear is the
    // post body going through it, which is what the old modal did.
    for (const file of ['page.tsx', '[slug]/page.tsx']) {
      const src = code(file);

      for (const match of src.matchAll(/dangerouslySetInnerHTML=\{\{[^}]*\}/g)) {
        expect(
          match[0],
          `${file} injects something other than serialised JSON-LD:\n${match[0]}`
        ).toMatch(/JSON\.stringify/);
      }
    }
  });

  it('the deleted modal has not come back', () => {
    // BlogModal.formatContent built an HTML string from model output and
    // injected it. It was removed rather than reused; reintroducing it would
    // put that back on a cached, indexed page.
    expect(() =>
      readFileSync(path.resolve(__dirname, '../../../components/BlogModal.tsx'), 'utf8')
    ).toThrow();
  });
});
