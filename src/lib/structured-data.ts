import { SITE_URL } from '@/lib/site';
import type { BlogPost } from '@/types/blog';

/**
 * Schema.org node builders.
 *
 * Pure functions returning plain objects, so the graph can be asserted in a
 * unit test without rendering a page. The component that emits them
 * (src/components/StructuredData.tsx) is a thin <script> wrapper and stays
 * that way — it must remain a server component, because a client component
 * would inject the JSON-LD on hydration, where it is visible in devtools and
 * invisible to every crawler.
 *
 * The @id values are the spine of the graph. Every node that refers to
 * Antonio points at PERSON rather than restating his details, so an assistant
 * reading the page resolves one entity instead of guessing whether three
 * similar descriptions are the same man.
 */

export const PERSON_ID = `${SITE_URL}/#person`;
export const PRACTICE_ID = `${SITE_URL}/#practice`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const BLOG_ID = `${SITE_URL}/blog#blog`;

/** An ISO date, or undefined when the value is unusable. */
function isoDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * One post.
 *
 * `dateModified` comes from the row rather than from `new Date()`. The home
 * page graph used to stamp the current time at module scope, which told every
 * consumer that every page changed on every build — a freshness claim that is
 * false often enough to be discounted entirely.
 */
export function blogPostingNode(post: BlogPost) {
  if (!post.slug) return null;

  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: post.excerpt,
    inLanguage: 'en',
    datePublished: isoDate(post.createdAt),
    dateModified: isoDate(post.updatedAt) ?? isoDate(post.createdAt),
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': BLOG_ID },
    ...(post.topic ? { about: post.topic } : {}),
    // Only real citations. An empty array would claim the post cites nothing,
    // which is a different statement from not saying.
    ...(post.caseStudyLink || post.sources?.length
      ? {
          citation: [
            ...(post.caseStudyLink ? [post.caseStudyLink] : []),
            ...(post.sources ?? []).map(source => source.url),
          ],
        }
      : {}),
  };
}

/** The index, as a collection that owns the posts rather than a loose page. */
export function blogCollectionNode(posts: readonly BlogPost[]) {
  return {
    '@type': 'Blog',
    '@id': BLOG_ID,
    url: `${SITE_URL}/blog`,
    name: 'Writing — Antonio Luis Santos',
    description:
      'Posts on LLM integration, decision automation, workflow automation and test strategy.',
    inLanguage: 'en',
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    blogPost: posts
      .filter(post => post.slug)
      .map(post => ({
        '@type': 'BlogPosting',
        '@id': `${SITE_URL}/blog/${post.slug}#post`,
        url: `${SITE_URL}/blog/${post.slug}`,
        headline: post.title,
        datePublished: isoDate(post.createdAt),
      })),
  };
}

/** Wraps nodes in the envelope every graph on this site shares. */
export function graph(nodes: readonly unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
