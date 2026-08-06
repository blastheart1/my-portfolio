/**
 * ClientLayoutContent.test.tsx
 *
 * /edit renders inside the root layout, so before this gate the admin also
 * mounted the whole public chrome: the floating nav, the mobile bottom bar,
 * back-to-top, a second theme toggle, the chatbot launcher — and CustomCursor,
 * which sets `cursor: none !important` on <html> and left the admin with no
 * pointer at all. They overlapped the sidebar and fought its own controls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

import ClientLayoutContent from '../ClientLayoutContent';

let mockPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/contexts/ModalContext', () => ({
  useModal: () => ({ isModalOpen: false }),
}));

// Each public-chrome component is stubbed with a findable marker; the point is
// which ones mount, not what they render.
vi.mock('../ThemeToggle', () => ({ default: () => <div data-testid="chrome-theme" /> }));
vi.mock('../BackToTop', () => ({ default: () => <div data-testid="chrome-backtotop" /> }));
vi.mock('../FloatingNav', () => ({ default: () => <div data-testid="chrome-floatingnav" /> }));
vi.mock('../MobileNav', () => ({ default: () => <div data-testid="chrome-mobilenav" /> }));
vi.mock('../PortfolioChatbotWrapper', () => ({
  default: () => <div data-testid="chrome-chatbot" />,
}));
vi.mock('../CustomCursor', () => ({
  default: () => {
    // Mirrors the real component's side effect, which is the damaging part.
    document.documentElement.classList.add('custom-cursor');
    return <div data-testid="chrome-cursor" />;
  },
}));

const CHROME = [
  'chrome-theme',
  'chrome-backtotop',
  'chrome-floatingnav',
  'chrome-mobilenav',
  'chrome-chatbot',
  'chrome-cursor',
];

beforeEach(() => {
  document.documentElement.classList.remove('custom-cursor');
});

describe('public routes keep the site chrome', () => {
  it.each(['/', '/website-workflow'])('renders all chrome on %s', path => {
    mockPathname = path;
    render(
      <ClientLayoutContent>
        <main>page</main>
      </ClientLayoutContent>
    );

    for (const id of CHROME) {
      expect(screen.getByTestId(id), id).toBeInTheDocument();
    }
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('applies the custom cursor on the public site', () => {
    mockPathname = '/';
    render(
      <ClientLayoutContent>
        <main>page</main>
      </ClientLayoutContent>
    );
    expect(document.documentElement).toHaveClass('custom-cursor');
  });
});

describe('admin routes get none of it', () => {
  it.each([
    '/edit',
    '/edit/projects',
    '/edit/content/hero',
    '/edit/chatbot',
    '/edit/login',
  ])('renders no public chrome on %s', path => {
    mockPathname = path;
    render(
      <ClientLayoutContent>
        <main>admin</main>
      </ClientLayoutContent>
    );

    for (const id of CHROME) {
      expect(screen.queryByTestId(id), id).not.toBeInTheDocument();
    }
  });

  it('still renders the admin content', () => {
    mockPathname = '/edit/projects';
    render(
      <ClientLayoutContent>
        <main>admin</main>
      </ClientLayoutContent>
    );
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('leaves the mouse cursor alone — the admin needs a pointer', () => {
    mockPathname = '/edit';
    render(
      <ClientLayoutContent>
        <main>admin</main>
      </ClientLayoutContent>
    );
    expect(document.documentElement).not.toHaveClass('custom-cursor');
  });

  it('does not mount a second theme toggle beside the sidebar’s own', () => {
    mockPathname = '/edit';
    render(
      <ClientLayoutContent>
        <main>admin</main>
      </ClientLayoutContent>
    );
    expect(screen.queryByTestId('chrome-theme')).not.toBeInTheDocument();
  });
});

describe('route matching', () => {
  it.each(['/editorial', '/edits', '/editor/posts'])(
    'does not treat %s as an admin route',
    path => {
      // A bare startsWith('/edit') would strip the chrome from any future
      // public route whose path merely begins with those characters.
      mockPathname = path;
      render(
        <ClientLayoutContent>
          <main>page</main>
        </ClientLayoutContent>
      );
      expect(screen.getByTestId('chrome-chatbot')).toBeInTheDocument();
    }
  );

  it('matches the bare /edit dashboard', () => {
    mockPathname = '/edit';
    render(
      <ClientLayoutContent>
        <main>admin</main>
      </ClientLayoutContent>
    );
    expect(screen.queryByTestId('chrome-chatbot')).not.toBeInTheDocument();
  });
});
