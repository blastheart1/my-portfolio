/**
 * ProjectsEditor.test.tsx
 *
 * Phase 4 (forms) + Phase 5 (reordering), on the reference entity.
 *
 * Focus is on the behaviours the brief calls out as easy to miss: server field
 * errors reaching the form, dirty-state guarding, keyboard reordering, and
 * confirmation naming the record.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import ProjectsEditor from '../ProjectsEditor';
import { ToastProvider } from '@/components/ui/toast';

const projects = [
  { id: 'p1', title: 'Alpha', description: 'First', tech: ['React'], link: null, image_url: null, sort_order: 0, visible: true },
  { id: 'p2', title: 'Beta', description: null, tech: [], link: null, image_url: null, sort_order: 1, visible: true },
  { id: 'p3', title: 'Gamma', description: null, tech: [], link: null, image_url: null, sort_order: 2, visible: false },
];

const renderEditor = (initial = projects) =>
  render(
    <ToastProvider>
      <ProjectsEditor initialProjects={structuredClone(initial)} />
    </ToastProvider>
  );

const ok = (body: unknown = {}) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('list rendering', () => {
  it('shows every project with its position', () => {
    renderEditor();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.getByText('3 projects')).toBeInTheDocument();
  });

  it('marks hidden projects with a badge, not just opacity', () => {
    renderEditor();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('shows an empty state with the primary action inline', () => {
    renderEditor([]);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add your first project/i })
    ).toBeInTheDocument();
  });
});

describe('reordering', () => {
  it('exposes a keyboard-operable handle describing its position', () => {
    renderEditor();
    expect(
      screen.getByRole('button', { name: /Reorder Alpha\. Position 1 of 3/ })
    ).toBeInTheDocument();
  });

  it('moves a row with the arrow keys', async () => {
    renderEditor();
    const handle = screen.getByRole('button', { name: /Reorder Alpha/ });

    handle.focus();
    await userEvent.keyboard('{ArrowDown}');

    // Alpha moved to position 2, so it now PATCHes the rows that shifted.
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const urls = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('/api/admin/projects/p1'))).toBe(true);
  });

  it('announces the move politely', async () => {
    const { container } = renderEditor();
    const handle = screen.getByRole('button', { name: /Reorder Alpha/ });

    handle.focus();
    await userEvent.keyboard('{ArrowDown}');

    const live = container.querySelector('[aria-live="polite"]');
    await waitFor(() =>
      expect(live?.textContent).toMatch(/Moved “Alpha” to position 2 of 3/)
    );
  });

  it('only PATCHes rows whose position actually changed', async () => {
    renderEditor();
    screen.getByRole('button', { name: /Reorder Alpha/ }).focus();
    await userEvent.keyboard('{ArrowDown}');

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const urls = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
    // Gamma sat at index 2 before and after — it must not be touched.
    expect(urls.some(u => u.includes('p3'))).toBe(false);
  });
});

describe('form', () => {
  it('opens an inline form on Edit', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));

    expect(screen.getByLabelText(/Title/)).toHaveValue('Alpha');
  });

  it('disables Save until something changes', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Title/), '!');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows an unsaved-changes indicator once dirty', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    await userEvent.type(screen.getByLabelText(/Title/), '!');

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('counts characters against the presentation limit', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));

    // 'Alpha' is 5 chars, project title soft limit is 60.
    expect(screen.getByText('5/60')).toBeInTheDocument();
  });

  it('maps server field errors back onto the form', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Invalid input',
        details: { fieldErrors: { title: ['String must contain at most 200 character(s)'] } },
      }),
    } as Response);

    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    await userEvent.type(screen.getByLabelText(/Title/), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Previously this was discarded in favour of a generic 'Save failed'.
    expect(await screen.findByText(/at most 200/)).toBeInTheDocument();
  });

  it('confirms the save by naming the record and the revalidation', async () => {
    vi.mocked(fetch).mockResolvedValue(ok({ id: 'p1', title: 'Alpha!' }));

    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    await userEvent.type(screen.getByLabelText(/Title/), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText(/“Alpha!” saved — public site revalidated/)
    ).toBeInTheDocument();
  });
});

describe('tech chip input', () => {
  it('commits a chip on Enter', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));

    const input = screen.getByLabelText(/Tech stack/);
    await userEvent.type(input, 'TypeScript{Enter}');

    expect(screen.getByRole('button', { name: 'Remove TypeScript' })).toBeInTheDocument();
  });

  it('commits on comma too', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    await userEvent.type(screen.getByLabelText(/Tech stack/), 'Vite,');

    expect(screen.getByRole('button', { name: 'Remove Vite' })).toBeInTheDocument();
  });

  it('removes the last chip on Backspace when the input is empty', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));

    // Alpha already has React.
    expect(screen.getByRole('button', { name: 'Remove React' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Tech stack/), '{Backspace}');

    expect(screen.queryByRole('button', { name: 'Remove React' })).not.toBeInTheDocument();
  });
});

describe('dirty guard', () => {
  it('asks before discarding unsaved edits', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    await userEvent.type(screen.getByLabelText(/Title/), '!');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      await screen.findByRole('dialog', { name: /Discard unsaved changes/ })
    ).toBeInTheDocument();
  });

  it('closes without asking when nothing changed', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('delete', () => {
  it('names the record in the confirmation', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(/Delete “Beta”/);
  });

  it('does not delete when cancelled', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('removes the row after confirming', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Beta' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Beta')).not.toBeInTheDocument());
  });
});

describe('visibility toggle', () => {
  it('is a switch, and updates optimistically without a toast', async () => {
    renderEditor();
    const toggle = screen.getByRole('switch', { name: 'Hide Alpha' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(toggle);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Show Alpha' })).toBeInTheDocument()
    );
  });

  it('rolls back and reports when the toggle fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);

    renderEditor();
    await userEvent.click(screen.getByRole('switch', { name: 'Hide Alpha' }));

    expect(await screen.findByText(/Could not hide “Alpha”/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Hide Alpha' })).toBeInTheDocument()
    );
  });
});
