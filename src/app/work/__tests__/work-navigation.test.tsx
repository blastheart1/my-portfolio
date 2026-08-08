/**
 * work-navigation.test.tsx
 *
 * /work linked only forward: its cards went to case studies and nothing
 * returned to the site. A case study linked back to the index, which then
 * stranded the visitor one hop later. Someone arriving from a search result had
 * no history to fall back on.
 *
 * Nothing in the existing suite would have caught this — every route rendered
 * and returned 200. It took reading the page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const isDemoVisible = vi.fn();
vi.mock('@/lib/content-queries', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/content-queries')>()),
  isDemoVisible: (id: string) => isDemoVisible(id),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import WorkIndexPage from '../page';
import WorkProjectPage from '../[slug]/page';
import { WORK_PROJECTS } from '@/lib/work-projects';

beforeEach(() => {
  isDemoVisible.mockReset();
  isDemoVisible.mockResolvedValue(true);
});

async function renderPage(element: Promise<React.ReactElement>) {
  render(await element);
}

function breadcrumb() {
  return screen.getByRole('navigation', { name: /breadcrumb/i });
}

describe('every page can get back', () => {
  it('/work links home', async () => {
    await renderPage(WorkIndexPage());

    expect(within(breadcrumb()).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('a case study links both home and to the index, in one click each', async () => {
    await renderPage(WorkProjectPage({ params: Promise.resolve({ slug: WORK_PROJECTS[0].slug }) }));

    const nav = within(breadcrumb());
    expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(nav.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work');
  });

  it('marks the current page rather than linking to itself', async () => {
    await renderPage(WorkProjectPage({ params: Promise.resolve({ slug: WORK_PROJECTS[0].slug }) }));

    const current = within(breadcrumb()).getByText(WORK_PROJECTS[0].title);
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
  });

  it('still offers a way home when every demo is hidden', async () => {
    isDemoVisible.mockResolvedValue(false);

    await renderPage(WorkIndexPage());

    // The index deliberately renders rather than 404ing, so this is the only
    // exit a stranded visitor has.
    expect(within(breadcrumb()).getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });
});

describe('breadcrumb markup matches the visible trail', () => {
  it('emits BreadcrumbList JSON-LD with the same labels, in order', async () => {
    await renderPage(WorkProjectPage({ params: Promise.resolve({ slug: WORK_PROJECTS[0].slug }) }));

    const script = document.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? '{}');

    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Home',
      'Work',
      WORK_PROJECTS[0].title,
    ]);
  });

  it('numbers the positions from one', async () => {
    await renderPage(WorkIndexPage());

    const script = document.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? '{}');

    expect(data.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2]);
  });

  it('omits the item URL on the current page, as the spec expects', async () => {
    await renderPage(WorkIndexPage());

    const script = document.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? '{}');

    expect(data.itemListElement[1].item).toBeUndefined();
    expect(data.itemListElement[0].item).toMatch(/^https?:\/\//);
  });
});
