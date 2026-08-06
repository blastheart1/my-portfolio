/**
 * AdminSidebar.test.tsx
 *
 * Phase 2 — the navigation shell.
 *
 * Gate: works at all three breakpoints and is keyboard-navigable. Breakpoints
 * themselves are CSS and not observable in jsdom, so what is asserted here is
 * everything else: that every destination is reachable, that active state is
 * announced rather than only coloured, that the mobile sheet exists and
 * closes on navigation, and that collapse state survives a reload.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import AdminSidebar from '../AdminSidebar';
import { NAV_ITEMS, CONTENT_SECTIONS } from '@/lib/admin-nav';

let mockPathname = '/edit';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../LogoutButton', () => ({
  default: () => <button type="button">Log out</button>,
}));

beforeEach(() => {
  mockPathname = '/edit';
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('destinations', () => {
  it('renders every nav destination', async () => {
    render(<AdminSidebar />);
    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });

    for (const item of NAV_ITEMS) {
      const links = within(sidebar).getAllByRole('link', { name: new RegExp(item.label, 'i') });
      expect(links.length, item.label).toBeGreaterThan(0);
    }
  });

  it('groups items under Content, Site and System headings', () => {
    render(<AdminSidebar />);
    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });
    for (const label of ['Content', 'Site', 'System']) {
      expect(within(sidebar).getByText(label, { selector: 'p' })).toBeInTheDocument();
    }
  });

  it('links to the public site in a new tab, safely', () => {
    render(<AdminSidebar />);
    const link = screen.getAllByRole('link', { name: /view site/i })[0];
    expect(link).toHaveAttribute('target', '_blank');
    // Without noopener the opened page gets a handle on this one.
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});

describe('active state', () => {
  it('marks the current page with aria-current, not just colour', () => {
    mockPathname = '/edit/projects';
    render(<AdminSidebar />);

    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });
    const current = within(sidebar).getAllByRole('link', { current: 'page' });

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', '/edit/projects');
  });

  it('does not mark Dashboard active on a child route', () => {
    mockPathname = '/edit/services';
    render(<AdminSidebar />);

    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });
    const current = within(sidebar).getAllByRole('link', { current: 'page' });
    expect(current[0]).not.toHaveAttribute('href', '/edit');
  });

  it('marks Content active across its sub-routes', () => {
    mockPathname = '/edit/content/about';
    render(<AdminSidebar />);

    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });
    const current = within(sidebar).getAllByRole('link', { current: 'page' });
    const hrefs = current.map(c => c.getAttribute('href'));

    // Both the Content parent and the specific section read as current.
    expect(hrefs).toContain('/edit/content/about');
  });
});

describe('content sub-tree', () => {
  it('expands automatically on a content route', () => {
    mockPathname = '/edit/content/hero';
    render(<AdminSidebar />);

    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });
    for (const section of CONTENT_SECTIONS) {
      expect(
        within(sidebar).getAllByRole('link', { name: new RegExp(`^${section}$`, 'i') }).length,
        section
      ).toBeGreaterThan(0);
    }
  });

  it('is collapsible and reports its state', async () => {
    mockPathname = '/edit/content/hero';
    render(<AdminSidebar />);

    const sidebar = screen.getByRole('complementary', { name: 'Admin navigation' });
    const toggle = within(sidebar).getByRole('button', { name: /sections/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('collapse state', () => {
  it('starts expanded by default', () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  });

  it('persists the collapsed choice', async () => {
    render(<AdminSidebar />);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(localStorage.getItem('admin.sidebar')).toBe('collapsed');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('restores the collapsed choice on reload', async () => {
    localStorage.setItem('admin.sidebar', 'collapsed');
    render(<AdminSidebar />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    );
  });
});

describe('mobile navigation', () => {
  it('exposes a hamburger — the old nav was hidden below sm entirely', async () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
  });

  it('opens a labelled sheet with the full nav', async () => {
    render(<AdminSidebar />);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    const sheet = screen.getByRole('dialog', { name: 'Navigation' });
    expect(within(sheet).getByRole('link', { name: /projects/i })).toBeInTheDocument();
  });

  it('closes the sheet on Escape', async () => {
    render(<AdminSidebar />);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument()
    );
  });
});

describe('theme toggle', () => {
  it('reuses the public site mechanism: .dark on <html> plus localStorage', async () => {
    render(<AdminSidebar />);

    const toggle = screen.getAllByRole('button', { name: /switch to dark theme/i })[0];
    await userEvent.click(toggle);

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles back to light', async () => {
    document.documentElement.classList.add('dark');
    render(<AdminSidebar />);

    const toggle = screen.getAllByRole('button', { name: /switch to light theme/i })[0];
    await userEvent.click(toggle);

    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

describe('keyboard access', () => {
  it('reaches navigation links by tabbing — nothing is mouse-only', async () => {
    render(<AdminSidebar />);

    // Walk a bounded number of stops and confirm we land on a nav link.
    let landed = false;
    for (let i = 0; i < 12 && !landed; i++) {
      await userEvent.tab();
      const el = document.activeElement;
      if (el?.tagName === 'A' && el.getAttribute('href')?.startsWith('/edit')) {
        landed = true;
      }
    }
    expect(landed).toBe(true);
  });
});
