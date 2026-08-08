import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { SITE_URL } from '@/lib/site';

/**
 * Breadcrumb trail for the /work routes.
 *
 * The case studies previously carried a single "← Work" link, which left a
 * visitor arriving from a search result one hop from the index and no hops from
 * the site itself. Both destinations are now reachable in one click.
 *
 * Emits BreadcrumbList JSON-LD from the same array that renders, so the markup
 * cannot describe a trail different from the visible one.
 */

export interface Crumb {
  label: string;
  /** Absent on the final crumb, which is the current page. */
  href?: string;
}

export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          {trail.map((crumb, i) => (
            <li key={crumb.label} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-gray-900 dark:hover:text-gray-100"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-gray-900 dark:text-gray-100">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
