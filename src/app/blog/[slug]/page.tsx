import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import Breadcrumbs from '@/components/work/Breadcrumbs';
import MarkdownBody from '@/components/ui/MarkdownBody';
import { normalizeContent } from '@/lib/blog/normalize-content';
import { getBlogPostBySlug } from '@/lib/database';
import { ogImageUrl } from '@/lib/og-url';
import { SITE_URL } from '@/lib/site';
import StructuredData from '@/components/StructuredData';
import { blogPostingNode } from '@/lib/structured-data';
import { BLOG_ROBOTS } from '@/lib/blog/visibility';

/**
 * /blog/[slug] — one post.
 *
 * No generateStaticParams, deliberately. Copying the pattern from
 * src/app/work/[slug]/page.tsx would look right and be wrong: work's params
 * come from a constant in the repo, these come from the database. At build time
 * with no credentials the list would be empty, and pairing that with
 * `dynamicParams = false` would 404 every cron-written post until someone
 * happened to deploy — baking a cached 404 in on the way. A revalidate floor
 * plus explicit revalidatePath on write is the mechanism that actually fits.
 */

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    // Never omit this. The root layout sets alternates.canonical to the home
    // page and Next merges metadata shallowly, so a route without its own
    // canonical tells Google it is a duplicate of / — which would collapse
    // this entire section. Guard rail N9.
    alternates: { canonical: url },
    robots: BLOG_ROBOTS,
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [SITE_URL],
      images: [
        {
          url: ogImageUrl({
            title: post.title,
            subtitle: post.excerpt,
            eyebrow: '~/writing $ cat',
            chips: post.topic ? [post.topic] : undefined,
          }),
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // getBlogPostBySlug returns null for an unknown slug, an unpublished one,
  // and an unreachable database alike. All three are a 404 here: a crawler
  // treats a 500 as a site fault worth retrying, and a 404 as simply not here.
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const node = blogPostingNode(post);
  const body = normalizeContent(post.content);
  const published = post.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <StructuredData nodes={node ? [node] : []} />

      <article className="mx-auto max-w-3xl px-6 py-24">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Writing', href: '/blog' },
            { label: post.title },
          ]}
        />

        <header className="mt-8">
          <h1
            className="text-4xl font-light uppercase leading-[0.95] tracking-[-0.02em]
                       text-gray-900 md:text-5xl dark:text-gray-100"
          >
            {post.title}
          </h1>

          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <time dateTime={post.createdAt.toISOString()}>{published}</time>
            {post.topic && (
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs dark:border-gray-700">
                {post.topic}
              </span>
            )}
          </p>
        </header>

        {/*
          MarkdownBody, not the modal's old formatContent. That built an HTML
          string and injected it with dangerouslySetInnerHTML, which was
          survivable in an overlay nobody could link to and is not survivable
          on a cached, indexed page rendering text a model wrote from
          third-party sources. react-markdown escapes instead. Guard rail N12.
        */}
        <div className="mt-10">
          <MarkdownBody>{body}</MarkdownBody>
        </div>

        {post.caseStudyLink && (
          <aside className="mt-12 rounded-xl border border-gray-200 p-6 dark:border-gray-700">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Source case study
            </h2>
            <a
              href={post.caseStudyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-words text-[var(--color-brand)] underline underline-offset-2"
            >
              {post.caseStudyLink}
            </a>
          </aside>
        )}

        {post.sources && post.sources.length > 0 && (
          <aside className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Sources
            </h2>
            <ul className="mt-3 space-y-2">
              {post.sources.map(source => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-brand)] underline underline-offset-2"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>
    </main>
  );
}
