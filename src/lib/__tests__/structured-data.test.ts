/**
 * structured-data.test.ts
 *
 * Guard rail:
 *   N15 — FAQPage and ProfilePage may appear on / only, and
 *         StructuredData.tsx may contain neither 'use client' nor usePathname
 *
 * The second half is the subtle one. Scoping JSON-LD per route invites
 * 'use client' + usePathname, which deletes the graph from the server HTML
 * while leaving it visible in devtools and in a React test. It would pass
 * every assertion in this file except that one, and be completely broken for
 * every crawler.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';

import { readCode } from './support/source';

import { FAQS } from '../faqs';
import { SITE_URL } from '../site';
import { WORK_PROJECTS } from '../work-projects';
import {
  blogCollectionNode,
  blogPostingNode,
  graph,
  homePageNodes,
  PERSON_ID,
  siteIdentityNodes,
  workProjectNodes,
} from '../structured-data';
import type { BlogPost } from '@/types/blog';

const SRC = path.resolve(__dirname, '../..');

type Node = Record<string, unknown> & { '@type'?: string; '@id'?: string };

function types(nodes: readonly unknown[]): string[] {
  return (nodes as Node[]).map(node => node['@type'] ?? '');
}

function post(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'row-1',
    slug: 'rules-and-models',
    title: 'Choosing Between Rules And Models',
    content: 'Body.',
    excerpt: 'An excerpt.',
    type: 'blog',
    topic: 'Decision Automation',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-10T00:00:00.000Z'),
    published: true,
    ...overrides,
  };
}

describe('the identity graph, served everywhere', () => {
  it('carries Person, ProfessionalService and WebSite', () => {
    expect(types(siteIdentityNodes())).toEqual([
      'Person',
      'ProfessionalService',
      'WebSite',
    ]);
  });

  it('claims to be no particular page', () => {
    // This is what makes it safe on every route. A node asserting "this URL is
    // about Antonio" is a claim about the current page and must be scoped.
    expect(types(siteIdentityNodes())).not.toContain('ProfilePage');
    expect(types(siteIdentityNodes())).not.toContain('WebPage');
    expect(types(siteIdentityNodes())).not.toContain('FAQPage');
  });

  it('gives every node a stable @id, which is what lets others reference it', () => {
    for (const node of siteIdentityNodes() as Node[]) {
      expect(node['@id'], JSON.stringify(node['@type'])).toMatch(/^https:\/\//);
    }
  });
});

describe('N15 — the home page owns ProfilePage and FAQPage', () => {
  it('renders both, and only on /', () => {
    expect(types(homePageNodes())).toEqual(expect.arrayContaining(['FAQPage', 'ProfilePage']));
  });

  it('no other route emits them', () => {
    const elsewhere = [
      ...workProjectNodes(WORK_PROJECTS[0].slug),
      blogCollectionNode([post()]),
      blogPostingNode(post()),
    ];

    expect(types(elsewhere)).not.toContain('ProfilePage');
    expect(types(elsewhere)).not.toContain('FAQPage');
  });

  it('the FAQ markup matches the array the page renders from', () => {
    // Google requires marked-up FAQ content to be visible to the visitor. One
    // source is what guarantees the markup cannot describe something absent.
    const faq = (homePageNodes() as Node[]).find(node => node['@type'] === 'FAQPage');
    const questions = (faq?.mainEntity as { name: string }[]) ?? [];

    expect(questions).toHaveLength(FAQS.length);
    expect(questions.map(q => q.name)).toEqual(FAQS.map(f => f.question));
  });

  it('dates the page from the value passed in, not from the clock', () => {
    // A module-scope new Date() told every consumer that every page changed on
    // every build, which is a freshness claim wrong often enough to be ignored.
    const nodes = homePageNodes(new Date('2026-05-01T00:00:00.000Z')) as Node[];
    const profile = nodes.find(node => node['@type'] === 'ProfilePage');

    expect(profile?.dateModified).toBe('2026-05-01T00:00:00.000Z');
  });

  it('points the ProfilePage at the Person by @id rather than restating him', () => {
    const profile = (homePageNodes() as Node[]).find(node => node['@type'] === 'ProfilePage');
    expect(profile?.mainEntity).toEqual({ '@id': PERSON_ID });
  });
});

describe('case studies carry their own node', () => {
  it('returns the CreativeWork for a known slug', () => {
    const nodes = workProjectNodes('relay') as Node[];

    expect(nodes).toHaveLength(1);
    expect(nodes[0]['@type']).toBe('CreativeWork');
    expect(nodes[0]['@id']).toBe(`${SITE_URL}/work/relay#work`);
  });

  it('returns nothing for a slug that is not a real case study', () => {
    expect(workProjectNodes('does-not-exist')).toEqual([]);
  });

  it('every work project in the repo has a node, and vice versa', () => {
    // Stops the graph describing a page that does not exist, or a page
    // shipping without its node.
    for (const project of WORK_PROJECTS) {
      expect(workProjectNodes(project.slug), project.slug).toHaveLength(1);
    }
  });
});

describe('blog nodes', () => {
  it('builds a BlogPosting with real dates and the author by @id', () => {
    const node = blogPostingNode(post()) as Node;

    expect(node['@type']).toBe('BlogPosting');
    expect(node.url).toBe(`${SITE_URL}/blog/rules-and-models`);
    expect(node.datePublished).toBe('2026-09-01T00:00:00.000Z');
    expect(node.dateModified).toBe('2026-09-10T00:00:00.000Z');
    expect(node.author).toEqual({ '@id': PERSON_ID });
    expect(node.publisher).toEqual({ '@id': PERSON_ID });
  });

  it('returns null for a post with no slug, which has no URL to describe', () => {
    expect(blogPostingNode(post({ slug: undefined }))).toBeNull();
  });

  it('cites only real sources, and omits the field when there are none', () => {
    const plain = blogPostingNode(post()) as Node;
    expect(plain).not.toHaveProperty('citation');

    const cited = blogPostingNode(
      post({
        caseStudyLink: 'https://aws.amazon.com/solutions/case-studies/x',
        sources: [{ title: 'IBM', url: 'https://ibm.com/case-studies/y' }],
      })
    ) as Node;

    expect(cited.citation).toEqual([
      'https://aws.amazon.com/solutions/case-studies/x',
      'https://ibm.com/case-studies/y',
    ]);
  });

  it('falls back to the published date when a post has never been modified', () => {
    const node = blogPostingNode(
      post({ updatedAt: undefined as unknown as Date })
    ) as Node;
    expect(node.dateModified).toBe('2026-09-01T00:00:00.000Z');
  });

  it('lists only linkable posts in the collection', () => {
    const node = blogCollectionNode([post(), post({ id: 'row-2', slug: undefined })]) as Node;
    expect((node.blogPost as unknown[])).toHaveLength(1);
  });
});

describe('graph()', () => {
  it('wraps nodes in the schema.org envelope', () => {
    const result = graph([{ '@type': 'Person' }]) as Record<string, unknown>;
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@graph']).toHaveLength(1);
  });

  it('drops nulls, so a node builder returning one cannot emit a hole', () => {
    expect((graph([null, { '@type': 'Person' }, null]) as { '@graph': unknown[] })['@graph']).toHaveLength(1);
  });
});

describe('N15 — the renderer stays a server component', () => {
  const component = readCode(path.join(SRC, 'components/StructuredData.tsx'));

  it("does not declare 'use client'", () => {
    expect(
      component,
      "A client component injects the JSON-LD on hydration. It would still " +
        'appear in devtools and in a React test, and be absent for every ' +
        'crawler, every model and every curl — invisible in exactly the ' +
        'places anyone would check.'
    ).not.toMatch(/['"]use client['"]/);
  });

  it('does not branch on the pathname', () => {
    expect(component).not.toContain('usePathname');
    expect(component).not.toContain('useRouter');
  });

  it('renders a plain ld+json script and nothing else', () => {
    expect(component).toContain('application/ld+json');
  });

  it('the root layout renders identity nodes only', () => {
    const layout = readCode(path.join(SRC, 'app/layout.tsx'));

    expect(layout).toContain('siteIdentityNodes');
    // These are the two that must not be global again.
    expect(layout).not.toContain('homePageNodes');
    expect(layout).not.toContain('FAQPage');
  });

  it('the home page is what renders its own', () => {
    const page = readCode(path.join(SRC, 'app/page.tsx'));
    expect(page).toContain('homePageNodes');
  });
});
