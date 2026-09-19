import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

import Breadcrumbs from '@/components/work/Breadcrumbs';
import MarkdownBody from '@/components/ui/MarkdownBody';
import StructuredData from '@/components/StructuredData';
import { getResearchDoc, getResearchDocs } from '@/lib/research';
import { ogImageUrl } from '@/lib/og-url';
import { SITE_URL } from '@/lib/site';
import { researchNodes } from '@/lib/structured-data';

/**
 * /research/[slug] — a long-form document.
 *
 * Separate from /blog on purpose. A blog post is read in one pass; a document
 * of this length is scanned, skipped around, and returned to. It gets a
 * contents list, numbered sections and a reference list, and the reading
 * layout is narrower than the blog's because a 3,000 word argument with code
 * blocks in it is unreadable at full width.
 *
 * Fully static: the content is a file in the repo, so these prerender at build
 * time and there is no database in the path at all.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return getResearchDocs().map(doc => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getResearchDoc(slug);
  if (!doc) return {};

  const url = `${SITE_URL}/research/${slug}`;

  return {
    title: doc.title,
    description: doc.abstract.slice(0, 200),
    // Explicit, always: the root layout's canonical is the home page and Next
    // merges metadata shallowly, so omitting this declares the document a
    // duplicate of /. Guard rail N9.
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: doc.title,
      description: doc.abstract.slice(0, 200),
      images: [
        {
          url: ogImageUrl({
            title: doc.title,
            subtitle: doc.subtitle ?? doc.abstract,
            eyebrow: '~/research $ cat',
          }),
          width: 1200,
          height: 630,
          alt: doc.title,
        },
      ],
    },
  };
}

export default async function ResearchDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getResearchDoc(slug);
  if (!doc) notFound();

  const published = doc.date
    ? new Date(doc.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <StructuredData nodes={researchNodes(doc)} />

      <div className="mx-auto max-w-6xl px-6 py-24">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Writing', href: '/blog' },
            { label: doc.title },
          ]}
        />

        <article className="mt-8 lg:grid lg:grid-cols-[1fr_16rem] lg:gap-16">
          <div className="min-w-0">
            <header>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--color-brand)]">
                Research
              </p>

              <h1
                className="mt-4 text-4xl font-light uppercase leading-[0.95] tracking-[-0.02em]
                           text-gray-900 md:text-5xl dark:text-gray-100"
              >
                {doc.title}
              </h1>

              {doc.subtitle && (
                <p
                  className="mt-3 max-w-3xl font-display text-xl font-light leading-snug
                             tracking-[0.01em] text-gray-500 md:text-2xl dark:text-gray-400"
                >
                  {doc.subtitle}
                </p>
              )}

              <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{doc.author}</span>
                {published && <time dateTime={doc.date}>{published}</time>}
                <span>{doc.wordCount.toLocaleString('en-US')} words</span>
              </p>
            </header>

            {/* The abstract is set apart rather than folded into the body: a
                reader deciding whether to spend twenty minutes wants the
                argument before the argument. */}
            <section
              aria-label="Abstract"
              className="mt-10 border-l-2 border-[var(--color-brand)] pl-6"
            >
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                Abstract
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {doc.abstract}
              </p>
            </section>

            {/* Contents inline on narrow screens, where the sidebar is hidden. */}
            {doc.sections.length > 3 && (
              <nav aria-label="Contents" className="mt-12 lg:hidden">
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                  Contents
                </h2>
                <ol className="mt-3 space-y-1 text-sm">
                  {doc.sections.map(section => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-gray-600 hover:text-[var(--color-brand)] dark:text-gray-400"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="mt-12 max-w-3xl">
              <MarkdownBody>{doc.body}</MarkdownBody>
            </div>

            <footer className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-700">
              <Link
                href="/blog"
                className="text-sm text-[var(--color-brand)] underline underline-offset-4"
              >
                ← Back to writing
              </Link>
            </footer>
          </div>

          {/* Sticky contents on desktop. A document this long is navigated
              rather than read straight through. */}
          {doc.sections.length > 3 && (
            <aside className="hidden lg:block">
              <nav aria-label="Contents" className="sticky top-24">
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                  Contents
                </h2>
                <ol className="mt-4 space-y-2 border-l border-gray-200 text-sm dark:border-gray-700">
                  {doc.sections.map(section => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block border-l-2 border-transparent -ml-px pl-4 leading-snug
                                   text-gray-500 transition-colors hover:border-[var(--color-brand)]
                                   hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
        </article>
      </div>
    </main>
  );
}
