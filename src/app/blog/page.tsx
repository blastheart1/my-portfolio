import Link from 'next/link';
import type { Metadata } from 'next';

import Breadcrumbs from '@/components/work/Breadcrumbs';
import { getBlogPosts, getPublishedBlogPostCount } from '@/lib/database';
import StructuredData from '@/components/StructuredData';
import { blogCollectionNode } from '@/lib/structured-data';
import { BLOG_ROBOTS } from '@/lib/blog/visibility';
import { ogImageUrl } from '@/lib/og-url';
import { SITE_URL } from '@/lib/site';

/**
 * /blog — the index.
 *
 * Until now the posts existed only inside a client component that fetched them
 * on mount and opened them in a modal. They had no URLs, appeared in no
 * sitemap, and were invisible to every crawler and every model. This is the
 * page that changes that.
 *
 * Server-rendered on purpose, not merely by default: the entire point is that
 * the titles and excerpts are in the HTML a crawler receives without running
 * JavaScript. scripts/check-indexability.sh measures exactly that.
 */

export const revalidate = 300;

const PAGE_SIZE = 12;

// Indexing is gated by BLOG_INDEXABLE in src/lib/blog/visibility.ts, which
// also governs whether these URLs appear in the sitemap. One switch, so the
// two can never contradict each other.

function canonicalFor(page: number): string {
  return page > 1 ? `${SITE_URL}/blog?page=${page}` : `${SITE_URL}/blog`;
}

function pageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const page = pageParam((await searchParams).page);

  return {
    title: page > 1 ? `Writing — page ${page}` : 'Writing',
    description:
      'Posts on LLM integration, decision automation, workflow automation and test strategy.',
    // Explicit, always. The root layout sets alternates.canonical to the home
    // page and Next merges metadata shallowly, so a route that omits this
    // declares itself a duplicate of / and gets collapsed into it. See N9.
    alternates: { canonical: canonicalFor(page) },
    robots: BLOG_ROBOTS,
    openGraph: {
      type: 'website',
      url: canonicalFor(page),
      title: 'Writing — Antonio Luis Santos',
      images: [
        {
          url: ogImageUrl({
            title: 'Writing',
            subtitle: 'Notes on integration, automation and where a model actually helps.',
            eyebrow: '~/writing $ ls',
          }),
          width: 1200,
          height: 630,
          alt: 'Writing — Antonio Luis Santos',
        },
      ],
    },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = pageParam((await searchParams).page);

  // Both reads swallow their own errors, so an unreachable database renders an
  // empty index rather than a 500. A crawler reads a 500 as a site fault and
  // comes back; an empty page it simply records.
  const [posts, total] = await Promise.all([
    getBlogPosts(PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getPublishedBlogPostCount(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkable = posts.filter(post => post.slug);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <StructuredData nodes={[blogCollectionNode(linkable)]} />

      <div className="mx-auto max-w-6xl px-6 py-24">
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Writing' }]} />

        <h1
          className="mt-8 text-4xl font-light uppercase leading-[0.95] tracking-[-0.02em]
                     text-gray-900 md:text-5xl dark:text-gray-100"
        >
          Writing.
          <span
            className="mt-2 block font-display text-xl font-light normal-case
                       leading-snug tracking-[0.01em] text-gray-400 md:text-2xl dark:text-gray-500"
          >
            Notes on integration, automation and where a model actually helps.
          </span>
        </h1>

        {linkable.length === 0 ? (
          <p className="mt-12 text-gray-500 dark:text-gray-400">Nothing published here just yet.</p>
        ) : (
          <ul className="mt-14 grid gap-6 md:grid-cols-2">
            {linkable.map(post => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full rounded-xl border border-gray-200 p-6
                             transition-colors hover:border-gray-400
                             dark:border-gray-700 dark:hover:border-gray-500"
                >
                  <h2 className="text-2xl font-light uppercase tracking-[-0.01em] text-gray-900 dark:text-gray-100">
                    {post.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-300">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <time dateTime={post.createdAt.toISOString()}>
                      {post.createdAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span className="group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      Read →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {lastPage > 1 && (
          <nav className="mt-14 flex items-center justify-between text-sm" aria-label="Pagination">
            {page > 1 ? (
              <Link href={page === 2 ? '/blog' : `/blog?page=${page - 1}`} rel="prev">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-gray-500 dark:text-gray-400">
              Page {page} of {lastPage}
            </span>
            {page < lastPage ? (
              <Link href={`/blog?page=${page + 1}`} rel="next">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
