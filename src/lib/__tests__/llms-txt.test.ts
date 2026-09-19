/**
 * llms-txt.test.ts
 *
 * Guard rail:
 *   N14 — public/llms.txt must not exist; the generated file must serve 200 as
 *         text/plain even when every data source throws, and must contain no
 *         wrong-domain URL and no price contradicting the JSON-LD offers
 *
 * Two failure modes here are silent, which is why they are tested rather than
 * commented.
 *
 * A file left in public/ shadows an App Router route of the same path with no
 * warning: the handler never runs, the stale copy serves forever, and a test
 * importing the route module still passes.
 *
 * And a composer that can throw turns a missing database into a 500 on a file
 * that scripts/check-indexability.sh asserts returns 200 — a file every
 * crawler treats as a static asset.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';

const getServiceTiers = vi.fn();
const getProjects = vi.fn();
const getBlogPosts = vi.fn();

vi.mock('@/lib/content-queries', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/content-queries')>()),
  getServiceTiers: () => getServiceTiers(),
  getProjects: () => getProjects(),
}));

vi.mock('@/lib/database', () => ({
  getBlogPosts: (limit: number) => getBlogPosts(limit),
}));

import { buildLlmsTxt, llmsResponse } from '../llms-txt';
import { FAQS } from '../faqs';
import { SITE_URL } from '../site';
import { WORK_PROJECTS } from '../work-projects';
import { siteIdentityNodes } from '../structured-data';

const ROOT = path.resolve(__dirname, '../../..');

const TIERS = [
  {
    id: '1',
    name: 'Starter',
    tagline: null,
    outcome: 'Up to 5 pages, responsive, contact form.',
    price_php: null,
    price_usd: 599,
    features: ['SEO basics', '7-day support'],
    is_popular: false,
    sort_order: 0,
    visible: true,
  },
  {
    id: '2',
    name: 'Professional',
    tagline: null,
    outcome: 'Up to 15 pages, e-commerce.',
    price_php: null,
    price_usd: 1199,
    features: ['Advanced SEO'],
    is_popular: true,
    sort_order: 1,
    visible: true,
  },
  {
    id: '3',
    name: 'Enterprise',
    tagline: null,
    outcome: 'Custom systems built to scale.',
    price_php: null,
    price_usd: 2999,
    features: ['30-day support'],
    is_popular: false,
    sort_order: 2,
    visible: true,
  },
];

const PROJECTS = [
  {
    id: 'p1',
    title: 'Resume Analyzer',
    description: 'AI resume analysis against job descriptions.',
    tech: ['React'],
    link: 'https://resume-ai-frontend-orpin.vercel.app',
    image_url: null,
    sort_order: 0,
    visible: true,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getServiceTiers.mockResolvedValue(TIERS);
  getProjects.mockResolvedValue(PROJECTS);
  getBlogPosts.mockResolvedValue([]);
});

describe('N14 — the static file is gone', () => {
  it('public/llms.txt does not exist', () => {
    // A file there shadows the route silently, and the route's tests would
    // still pass while the stale copy served forever.
    expect(
      existsSync(path.join(ROOT, 'public/llms.txt')),
      'public/llms.txt shadows src/app/llms.txt/route.ts. The handler would ' +
        'never run and the stale hand-maintained copy would serve forever.'
    ).toBe(false);
  });

  it('public/llms-full.txt does not exist either', () => {
    expect(existsSync(path.join(ROOT, 'public/llms-full.txt'))).toBe(false);
  });
});

describe('N14 — it never fails, whatever the database is doing', () => {
  it('still returns the narrative when every read throws', async () => {
    getServiceTiers.mockRejectedValue(new Error('Neon unreachable'));
    getProjects.mockRejectedValue(new Error('Neon unreachable'));
    getBlogPosts.mockRejectedValue(new Error('Supabase is not configured'));

    const body = await buildLlmsTxt();

    expect(body).toContain('# Antonio Luis Santos');
    expect(body).toContain('## Who');
    expect(body).toContain('## Common questions');
    // The section that needed the database is dropped, not the response.
    expect(body).not.toContain('## Services');
  });

  it('drops only the section whose source failed', async () => {
    getServiceTiers.mockRejectedValue(new Error('down'));

    const body = await buildLlmsTxt();

    expect(body).not.toContain('## Services');
    expect(body).toContain('## Selected work');
    expect(body).toContain('## Live demos on this site');
  });

  it('omits a section rather than printing an empty heading', async () => {
    getServiceTiers.mockResolvedValue([]);
    getProjects.mockResolvedValue([]);

    const body = await buildLlmsTxt();

    expect(body).not.toContain('## Services');
    expect(body).not.toContain('## Selected work');
  });

  it('leaves no blank run where a section was dropped', async () => {
    getServiceTiers.mockRejectedValue(new Error('down'));
    const body = await buildLlmsTxt();
    expect(body).not.toMatch(/\n{3,}/);
  });
});

describe('the response headers crawlers depend on', () => {
  it('serves text/plain explicitly', async () => {
    // next.config.ts sends X-Content-Type-Options: nosniff on every route, so
    // a wrong or missing content type makes the file unreadable with no
    // visible error anywhere.
    const response = llmsResponse(await buildLlmsTxt());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/);
  });

  it('is cacheable at the edge but revalidates', async () => {
    const cacheControl = llmsResponse('x').headers.get('cache-control') ?? '';
    expect(cacheControl).toContain('s-maxage');
  });
});

describe('N14 — it cannot contradict the JSON-LD', () => {
  it('states the same prices as the offer catalog', async () => {
    // The whole reason this file is generated. A model reading $599 in the
    // schema and something else here is the exact failure llms.txt exists to
    // prevent, and the hand-maintained copy was free to introduce it.
    const body = await buildLlmsTxt();

    const practice = siteIdentityNodes().find(
      node => (node as { '@type'?: string })['@type'] === 'ProfessionalService'
    ) as { hasOfferCatalog?: { itemListElement?: { name: string; price: string }[] } };

    const offers = practice.hasOfferCatalog?.itemListElement ?? [];
    expect(offers.length).toBeGreaterThan(0);

    for (const offer of offers) {
      const formatted = `$${Number(offer.price).toLocaleString('en-US')}`;
      expect(body, `${offer.name} is priced ${formatted} in the JSON-LD`).toContain(formatted);
    }
  });

  it('names every tier the database returns', async () => {
    const body = await buildLlmsTxt();
    for (const tier of TIERS) expect(body).toContain(tier.name);
  });

  it('uses no URL on any other domain of ours', async () => {
    const body = await buildLlmsTxt();

    for (const match of body.matchAll(/https?:\/\/(\w*)luis\.dev/gi)) {
      expect(match[1].toLowerCase(), `wrong-domain URL: ${match[0]}`).toBe('codeby');
    }
  });

  it('links every case study at its real URL', async () => {
    const body = await buildLlmsTxt();
    for (const project of WORK_PROJECTS) {
      expect(body).toContain(`${SITE_URL}/work/${project.slug}`);
    }
  });

  it('carries the FAQ verbatim from the same array the page renders', async () => {
    const body = await buildLlmsTxt();
    for (const faq of FAQS) {
      expect(body).toContain(faq.question);
      expect(body).toContain(faq.answer);
    }
  });
});

describe('the full variant', () => {
  it('inlines the case-study prose the short one only links to', async () => {
    const short = await buildLlmsTxt();
    const full = await buildLlmsTxt({ full: true });

    expect(full.length).toBeGreaterThan(short.length);
    expect(full).toContain('## Case studies in full');
    expect(short).not.toContain('## Case studies in full');

    for (const project of WORK_PROJECTS) {
      expect(full).toContain(project.summary);
    }
  });
});

describe('recent writing follows the blog switch', () => {
  it('lists no post URLs while the blog is not advertised', async () => {
    // Naming URLs that carry noindex is the same contradiction the sitemap
    // avoids, and llms.txt is read by the crawlers most likely to just fetch
    // what it names.
    const { BLOG_INDEXABLE } = await import('../blog/visibility');

    getBlogPosts.mockResolvedValue([
      { id: '1', slug: 'a-post', title: 'A Post', excerpt: 'x', createdAt: new Date() },
    ]);

    const body = await buildLlmsTxt();

    if (BLOG_INDEXABLE) {
      expect(body).toContain('## Recent writing');
    } else {
      expect(body).not.toContain('## Recent writing');
      // And it does not even ask for them.
      expect(getBlogPosts).not.toHaveBeenCalled();
    }
  });
});
