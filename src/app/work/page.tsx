import Link from 'next/link';
import type { Metadata } from 'next';

import { isDemoVisible } from '@/lib/content-queries';
import { WORK_PROJECTS } from '@/lib/work-projects';
import { SITE_URL } from '@/lib/site';
import Breadcrumbs from '@/components/work/Breadcrumbs';

/**
 * /work — the case-study index.
 *
 * The page itself is always reachable; only individual cards come and go with
 * their section toggle. An index that 404s when everything is switched off
 * would break the back link out of a case study mid-session.
 */

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Case studies with working demos: a voice-note-to-email drafting tool with a second model auditing it, and sanitized automation workflows built for live businesses.',
  alternates: { canonical: `${SITE_URL}/work` },
};

// Visibility is a database read, so this cannot be fully static. A short
// revalidate keeps it cheap while letting an admin toggle take effect without
// a redeploy.
export const revalidate = 60;

export default async function WorkIndexPage() {
  const visible = await Promise.all(
    WORK_PROJECTS.map(async project => ({
      project,
      shown: await isDemoVisible(project.sectionId),
    }))
  );
  const projects = visible.filter(entry => entry.shown).map(entry => entry.project);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-24">
        {/* The index had only forward links, so anyone who reached it was
            stranded here. */}
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: 'Work' }]} />

        <h1
          className="mt-8 text-4xl font-light uppercase leading-[0.95] tracking-[-0.02em]
                     text-gray-900 md:text-5xl dark:text-gray-100"
        >
          Work.
          <span
            className="mt-2 block font-display text-xl font-light normal-case
                       leading-snug tracking-[0.01em] text-gray-400 md:text-2xl dark:text-gray-500"
          >
            Things you can actually try, not screenshots.
          </span>
        </h1>

        {projects.length === 0 ? (
          <p className="mt-12 text-gray-500 dark:text-gray-400">
            Nothing published here just yet.
          </p>
        ) : (
          <ul className="mt-14 grid gap-6 md:grid-cols-2">
            {projects.map(project => (
              <li key={project.slug}>
                <Link
                  href={`/work/${project.slug}`}
                  className="group block h-full rounded-xl border border-gray-200 p-6
                             transition-colors hover:border-gray-400
                             dark:border-gray-700 dark:hover:border-gray-500"
                >
                  <h2 className="text-2xl font-light uppercase tracking-[-0.01em] text-gray-900 dark:text-gray-100">
                    {project.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-300">
                    {project.tagline}
                  </p>
                  <span className="mt-4 inline-block text-sm text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
