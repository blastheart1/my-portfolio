/**
 * FeaturedWork.test.tsx
 *
 * The Work block on the home page carried a small label where every other
 * section carries a heading, so it read as a widget rather than part of the
 * page. It now uses the same treatment, from the same database table, and is
 * editable in /edit like the rest.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const isDemoVisible = vi.fn();
vi.mock('@/lib/content-queries', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/content-queries')>()),
  isDemoVisible: (id: string) => isDemoVisible(id),
}));

import FeaturedWork from '../FeaturedWork';
import { WORK_PROJECTS } from '@/lib/work-projects';

beforeEach(() => {
  isDemoVisible.mockReset();
  isDemoVisible.mockResolvedValue(true);
});

async function renderWork(props: { heading?: string; subheading?: string } = {}) {
  render(await FeaturedWork(props));
}

describe('heading', () => {
  it('uses the wording supplied from the database', async () => {
    await renderWork({ heading: 'Selected work.', subheading: 'Two you can play with.' });

    expect(screen.getByRole('heading', { name: /selected work/i })).toBeInTheDocument();
    expect(screen.getByText('Two you can play with.')).toBeInTheDocument();
  });

  it('falls back when the database gives nothing', async () => {
    // A content outage must not leave the section headless.
    await renderWork();

    expect(screen.getByRole('heading', { name: /work\./i })).toBeInTheDocument();
    expect(screen.getByText(/not screenshots/i)).toBeInTheDocument();
  });

  it('renders as a section heading, matching the rest of the page', async () => {
    await renderWork();

    const heading = screen.getByRole('heading', { level: 2 });
    // Same Jost Light uppercase treatment the other sections use; a different
    // level or weight here is what made it look bolted on.
    expect(heading.className).toContain('font-light');
    expect(heading.className).toContain('uppercase');
  });
});

describe('cards', () => {
  it('links each visible demo to its case study', async () => {
    await renderWork();

    for (const project of WORK_PROJECTS) {
      expect(screen.getByRole('link', { name: new RegExp(project.title, 'i') })).toHaveAttribute(
        'href',
        `/work/${project.slug}`
      );
    }
  });

  it('offers a route to the full index', async () => {
    await renderWork();

    expect(screen.getByRole('link', { name: /all work/i })).toHaveAttribute('href', '/work');
  });

  it('renders nothing at all when every demo is hidden', async () => {
    isDemoVisible.mockResolvedValue(false);

    const { container } = render((await FeaturedWork({})) ?? <></>);

    // No heading pointing at an empty index.
    expect(container).toBeEmptyDOMElement();
  });
});
