import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import type { WorkProject } from '@/lib/work-projects';

/**
 * Shared chrome for a case study at /work/[slug].
 *
 * Carries the home page's type treatment (Jost Light uppercase headings,
 * max-w-6xl) so a demo reads as part of the site rather than an app someone
 * bolted on. The demo itself is handed in as children and sits inside a
 * bordered frame, which is what makes it look like a product you can touch
 * instead of a screenshot.
 *
 * The back link is a real <Link> in a fixed position on every case study.
 * Visitors arriving from a search result have no history to go back to, so
 * relying on the browser control would strand them.
 */
export default function CaseStudyLayout({
  project,
  children,
}: {
  project: WorkProject;
  children?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link
          href="/work"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors
                     hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Work
        </Link>

        <header className="mt-10">
          <h1
            className="text-4xl font-light uppercase leading-[0.95] tracking-[-0.02em]
                       text-gray-900 md:text-5xl dark:text-gray-100"
          >
            {project.title}
          </h1>
          <p
            className="mt-3 max-w-3xl font-display text-xl font-light leading-snug
                       tracking-[0.01em] text-gray-500 md:text-2xl dark:text-gray-400"
          >
            {project.tagline}
          </p>
        </header>

        <p className="mt-8 max-w-3xl leading-relaxed text-gray-600 dark:text-gray-300">
          {project.summary}
        </p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Built with">
          {project.tech.map(item => (
            <li
              key={item}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs
                         text-gray-600 dark:border-gray-700 dark:text-gray-400"
            >
              {item}
            </li>
          ))}
        </ul>

        {children && (
          <div
            className="mt-12 overflow-hidden rounded-xl border border-gray-200
                       bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {children}
          </div>
        )}
      </div>
    </main>
  );
}
