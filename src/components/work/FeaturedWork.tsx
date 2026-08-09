import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { isDemoVisible } from '@/lib/content-queries';
import { WORK_PROJECTS } from '@/lib/work-projects';

/**
 * Featured case studies, above the project cards on the home page.
 *
 * A server component so it can read visibility, and rendered separately from
 * ProjectsSection rather than folded into it: those cards come from the
 * database and are managed in /edit, while these are hand-built pages. Keeping
 * them apart means neither can break the other, and removing a project card
 * stays a decision made in the admin rather than in code.
 *
 * Renders nothing when both demos are hidden, so the home page shows no
 * heading pointing at an empty index.
 */
export default async function FeaturedWork({
  heading,
  subheading,
}: {
  heading?: string;
  subheading?: string;
} = {}) {
  const entries = await Promise.all(
    WORK_PROJECTS.map(async project => ({
      project,
      shown: await isDemoVisible(project.sectionId),
    }))
  );
  const featured = entries.filter(e => e.shown).map(e => e.project);

  if (featured.length === 0) return null;

  return (
    <div className="mb-12 mt-24">
      {/* Same heading treatment as every other section on the page — Jost
          Light uppercase with a sentence-case subheading. Both come from
          section_content so they are editable from /edit like the rest, with a
          fallback for a database outage. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-4xl font-light uppercase leading-[0.95] tracking-[-0.02em] text-gray-900 md:text-5xl dark:text-gray-100">
          {heading || 'Work.'}
          <span className="mt-2 block font-display text-xl font-light normal-case leading-snug tracking-[0.01em] text-gray-400 md:text-2xl dark:text-gray-500">
            {subheading || 'Things you can actually try, not screenshots.'}
          </span>
        </h2>

        <Link
          href="/work"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors
                     hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          All work
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {featured.map(project => (
          <li key={project.slug}>
            <Link
              href={`/work/${project.slug}`}
              className="group block h-full rounded-2xl border border-gray-200 bg-white p-6
                         transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                         dark:border-gray-800 dark:bg-gray-900"
            >
              <h4 className="font-sf-pro text-xl font-semibold leading-tight text-gray-900 dark:text-gray-100">
                {project.title}
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {project.tagline}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Open the demo
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
