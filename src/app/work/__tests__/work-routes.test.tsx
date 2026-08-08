/**
 * work-routes.test.tsx
 *
 * A demo switched off in /edit/sections must be unreachable, not merely absent
 * from the index. These URLs go into the sitemap and get indexed, so a live
 * route behind a hidden toggle would keep serving a paid demo to anyone holding
 * the link.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const isDemoVisible = vi.fn();
vi.mock('@/lib/content-queries', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/content-queries')>()),
  isDemoVisible: (id: string) => isDemoVisible(id),
}));

const notFound = vi.fn(() => {
  // Mirrors Next's control flow: notFound() throws rather than returning.
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound: () => notFound() }));

import WorkIndexPage from '../page';
import WorkProjectPage from '../[slug]/page';
import { WORK_PROJECTS } from '@/lib/work-projects';

beforeEach(() => {
  isDemoVisible.mockReset();
  notFound.mockClear();
});

const slugOf = (i: number) => WORK_PROJECTS[i].slug;

async function renderPage(element: Promise<React.ReactElement>) {
  render(await element);
}

describe('a hidden demo is unreachable', () => {
  it('404s the case study when its section is off', async () => {
    isDemoVisible.mockResolvedValue(false);

    await expect(
      WorkProjectPage({ params: Promise.resolve({ slug: slugOf(0) }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('404s when the database read fails, rather than exposing the demo', async () => {
    // isDemoVisible already fails closed; this pins the route's half of it.
    isDemoVisible.mockResolvedValue(false);

    await expect(
      WorkProjectPage({ params: Promise.resolve({ slug: slugOf(1) }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('404s an unknown slug', async () => {
    isDemoVisible.mockResolvedValue(true);

    await expect(
      WorkProjectPage({ params: Promise.resolve({ slug: 'no-such-project' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('omits the card from the index', async () => {
    isDemoVisible.mockResolvedValue(false);

    await renderPage(WorkIndexPage());

    expect(screen.queryByRole('heading', { name: WORK_PROJECTS[0].title })).toBeNull();
    expect(screen.getByText(/nothing published here/i)).toBeInTheDocument();
  });
});

describe('a visible demo renders', () => {
  it('renders the case study with its title and back link', async () => {
    isDemoVisible.mockResolvedValue(true);

    await renderPage(WorkProjectPage({ params: Promise.resolve({ slug: slugOf(0) }) }));

    expect(
      screen.getByRole('heading', { name: WORK_PROJECTS[0].title, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /work/i })).toHaveAttribute('href', '/work');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('lists it on the index, linking to its slug', async () => {
    isDemoVisible.mockResolvedValue(true);

    await renderPage(WorkIndexPage());

    for (const project of WORK_PROJECTS) {
      expect(
        screen.getByRole('link', { name: new RegExp(project.title, 'i') })
      ).toHaveAttribute('href', `/work/${project.slug}`);
    }
  });

  it('shows only the demos that are on', async () => {
    isDemoVisible.mockImplementation(async (id: string) => id === WORK_PROJECTS[0].sectionId);

    await renderPage(WorkIndexPage());

    expect(screen.getByRole('heading', { name: WORK_PROJECTS[0].title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: WORK_PROJECTS[1].title })).toBeNull();
  });
});

describe('the index survives everything being hidden', () => {
  it('still renders rather than 404ing, so the back link works mid-session', async () => {
    isDemoVisible.mockResolvedValue(false);

    await renderPage(WorkIndexPage());

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
