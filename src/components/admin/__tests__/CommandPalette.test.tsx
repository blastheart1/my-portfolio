/**
 * CommandPalette.test.tsx
 *
 * Phase 7 — the command palette and global shortcuts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import CommandPalette from '../CommandPalette';
import AdminShortcuts from '../AdminShortcuts';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockClear();
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with focus in the input', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole('combobox')).toHaveFocus()
    );
  });

  it('lists pages, content sections, and actions', () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    const list = screen.getByRole('listbox');

    expect(list).toHaveTextContent('Projects');
    expect(list).toHaveTextContent('Edit hero content');
    expect(list).toHaveTextContent('Toggle theme');
  });

  it('filters by substring', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByRole('combobox'), 'servi');

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.textContent?.toLowerCase()).toContain('servi');
    }
  });

  it('reports no matches rather than rendering an empty box', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByRole('combobox'), 'zzzzzz');

    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('moves the selection with arrow keys', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    const input = screen.getByRole('combobox');

    const firstSelected = screen.getAllByRole('option')[0];
    expect(firstSelected).toHaveAttribute('aria-selected', 'true');

    await userEvent.type(input, '{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('wraps around at the ends', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByRole('combobox'), '{ArrowUp}');

    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('runs the selected command on Enter and closes', async () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} />);

    await userEvent.type(screen.getByRole('combobox'), 'projects{Enter}');

    expect(push).toHaveBeenCalledWith('/edit/projects');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('runs a command on click', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByRole('combobox'), 'Edit blog');
    await userEvent.click(screen.getAllByRole('option')[0]);

    expect(push).toHaveBeenCalledWith('/edit/content/blog');
  });

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByRole('combobox'), '{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('points aria-activedescendant at the highlighted option', () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    const input = screen.getByRole('combobox');
    const selected = screen.getAllByRole('option')[0];

    expect(input).toHaveAttribute('aria-activedescendant', selected.id);
  });

  it('runs the theme action', async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByRole('combobox'), 'toggle theme{Enter}');

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('AdminShortcuts', () => {
  it('opens the palette on Cmd-K', async () => {
    render(<AdminShortcuts />);
    await userEvent.keyboard('{Meta>}k{/Meta}');

    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('opens the palette on Ctrl-K too', async () => {
    render(<AdminShortcuts />);
    await userEvent.keyboard('{Control>}k{/Control}');

    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('shows the cheat sheet on ?', async () => {
    render(<AdminShortcuts />);
    await userEvent.keyboard('?');

    expect(
      await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    ).toBeInTheDocument();
  });

  it('does not hijack ? while typing in a field', async () => {
    render(
      <>
        <input aria-label="Title" />
        <AdminShortcuts />
      </>
    );

    const input = screen.getByLabelText('Title');
    await userEvent.type(input, 'why?');

    // The character must land in the field, not open a dialog.
    expect(input).toHaveValue('why?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signals the sidebar on Cmd-B', async () => {
    const listener = vi.fn();
    window.addEventListener('admin:toggle-sidebar', listener);

    render(<AdminShortcuts />);
    await userEvent.keyboard('{Meta>}b{/Meta}');

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('admin:toggle-sidebar', listener);
  });
});
