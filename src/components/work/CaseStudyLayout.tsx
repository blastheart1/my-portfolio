import type { WorkProject } from '@/lib/work-projects';
import Breadcrumbs from './Breadcrumbs';

/**
 * Shared chrome for a case study at /work/[slug].
 *
 * Carries the home page's type treatment (Jost Light uppercase headings,
 * max-w-6xl) so a demo reads as part of the site rather than an app someone
 * bolted on. The demo itself is handed in as children and sits inside a
 * bordered frame, which is what makes it look like a product you can touch
 * instead of a screenshot.
 *
 * The whole page runs to the viewport, not just the demo frame: a narrow
 * header above a full-width demo read as two different pages stacked. Only the
 * paragraphs keep a reading measure, because long lines are hard to follow
 * however wide the container is.
 *
 * Navigation is a breadcrumb rather than a single back link. A visitor
 * arriving from a search result has no history to go back to, and the earlier
 * "← Work" only reached the index — which itself had no way back to the site,
 * so they were stranded one hop later. Both destinations are now one click.
 */
export default function CaseStudyLayout({
  project,
  children,
  /**
   * Pins the demo frame to the viewport on desktop and lets its panes scroll
   * internally, instead of the whole page growing past the fold.
   *
   * Opt-in rather than automatic: it only makes sense for a demo whose panes
   * can each own their scrolling. A demo that is simply tall would be worse
   * inside a fixed-height box than outside one.
   */
  fillViewport = false,
}: {
  project: WorkProject;
  children?: React.ReactNode;
  fillViewport?: boolean;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[120rem] px-4 pt-12 sm:px-6">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Work', href: '/work' },
            { label: project.title },
          ]}
        />

        <header className="mt-8">
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

      </div>

      {children && (
        // Outside the reading column: full width up to a generous ceiling, so
        // an ultrawide monitor does not stretch a node canvas across a metre
        // of glass.
        <div className="mx-auto w-full max-w-[120rem] px-4 pb-16 pt-8 sm:px-6">
          <div
            className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm
                        dark:border-gray-700 dark:bg-gray-900 ${
                          fillViewport
                            ? // Sticks once the header has scrolled past, then
                              // fills the viewport. Nothing above it sets
                              // overflow on html or body, which is what would
                              // silently break position: sticky.
                              'md:sticky md:top-6 md:flex md:max-h-[calc(100vh-3rem)] md:flex-col'
                            : ''
                        }`}
          >
            {children}
          </div>
        </div>
      )}

      {!children && <div className="pb-16" />}
    </main>
  );
}
