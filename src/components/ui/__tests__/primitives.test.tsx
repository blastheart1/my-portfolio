/**
 * primitives.test.tsx
 *
 * Phase 1 of the admin redesign. These assert the behaviours that are easy to
 * regress and invisible in review — focus discipline, ARIA state, keyboard
 * interaction — not styling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import { Switch } from '../switch';
import { Label } from '../label';
import { Dialog, AlertDialog } from '../dialog';
import { Sheet } from '../sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import { ToastProvider, useToast } from '../toast';
import { Skeleton, SkeletonList } from '../skeleton';

// ─── Switch ──────────────────────────────────────────────────────────────────

describe('Switch', () => {
  it('exposes role=switch with aria-checked, not aria-pressed', async () => {
    // SectionToggle used aria-pressed, which announces as a toggle button
    // rather than an on/off control.
    render(<Switch checked={false} onCheckedChange={() => {}} label="Visible" />);

    const el = screen.getByRole('switch', { name: 'Visible' });
    expect(el).toHaveAttribute('aria-checked', 'false');
    expect(el).not.toHaveAttribute('aria-pressed');
  });

  it('reflects the checked state', () => {
    render(<Switch checked onCheckedChange={() => {}} label="Visible" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles on click, passing the inverted value', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="Visible" />);

    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('is reachable and operable by keyboard', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="Visible" />);

    await userEvent.tab();
    expect(screen.getByRole('switch')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="Visible" disabled />);

    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── Label ───────────────────────────────────────────────────────────────────

describe('Label', () => {
  it('associates with its control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="title">Title</Label>
        <input id="title" />
      </>
    );
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('announces required rather than relying on the asterisk glyph alone', () => {
    render(<Label required>Title</Label>);
    expect(screen.getByText('(required)')).toBeInTheDocument();
  });
});

// ─── Dialog ──────────────────────────────────────────────────────────────────

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Edit">
        <button>Inside</button>
      </Dialog>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a modal dialog labelled by its title', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Edit project">
        <button>Inside</button>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Edit project');
  });

  it('moves focus into the dialog on open', async () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Edit">
        <button>First</button>
        <button>Second</button>
      </Dialog>
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'First' })).toHaveFocus());
  });

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Edit">
        <button>Inside</button>
      </Dialog>
    );
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('traps Tab inside the dialog', async () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Edit">
        <button>First</button>
        <button>Last</button>
      </Dialog>
    );
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    await waitFor(() => expect(first).toHaveFocus());
    await userEvent.tab();
    expect(last).toHaveFocus();
    // Wrapping from the last element returns to the first, never escaping.
    await userEvent.tab();
    expect(first).toHaveFocus();
  });

  it('restores focus to the trigger on close', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Dialog open={open} onOpenChange={setOpen} title="Edit">
            <button>Inside</button>
          </Dialog>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });

    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('locks background scroll while open and restores it after', async () => {
    const { rerender } = render(
      <Dialog open onOpenChange={() => {}} title="Edit">
        <button>Inside</button>
      </Dialog>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Dialog open={false} onOpenChange={() => {}} title="Edit">
        <button>Inside</button>
      </Dialog>
    );
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

// ─── AlertDialog ─────────────────────────────────────────────────────────────

describe('AlertDialog', () => {
  it('focuses Cancel, so a stray Enter cannot delete', async () => {
    render(
      <AlertDialog
        open
        onOpenChange={() => {}}
        title="Delete “Portfolio site”?"
        onConfirm={() => {}}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    );
  });

  it('names the record in the title', () => {
    render(
      <AlertDialog
        open
        onOpenChange={() => {}}
        title="Delete “Portfolio site”?"
        onConfirm={() => {}}
      />
    );
    // window.confirm() could not do this — it had no idea what was being deleted.
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Portfolio site/);
  });

  it('calls onConfirm only when the destructive action is chosen', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange} title="Delete?" onConfirm={onConfirm} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows pending state and blocks double submission', async () => {
    const onConfirm = vi.fn();
    render(
      <AlertDialog open onOpenChange={() => {}} title="Delete?" onConfirm={onConfirm} pending />
    );
    const confirm = screen.getByRole('button', { name: 'Deleting…' });
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ─── Sheet ───────────────────────────────────────────────────────────────────

describe('Sheet', () => {
  it('is a modal dialog with an accessible name', () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Edit experience">
        <button>Field</button>
      </Sheet>
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Edit experience');
  });

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Edit">
        <button>Field</button>
      </Sheet>
    );
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('lets a dirty form veto the close', async () => {
    const onOpenChange = vi.fn();
    const onRequestClose = vi.fn(() => false);

    render(
      <Sheet open onOpenChange={onOpenChange} title="Edit" onRequestClose={onRequestClose}>
        <button>Field</button>
      </Sheet>
    );

    await userEvent.keyboard('{Escape}');
    expect(onRequestClose).toHaveBeenCalled();
    // Vetoed — the drawer stays open so the discard dialog can take over.
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

// ─── Tabs ────────────────────────────────────────────────────────────────────

describe('Tabs', () => {
  function Harness() {
    const [tab, setTab] = React.useState('config');
    return (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList label="Chatbot settings">
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="config">Config panel</TabsContent>
        <TabsContent value="examples">Examples panel</TabsContent>
        <TabsContent value="logs">Logs panel</TabsContent>
      </Tabs>
    );
  }

  it('renders a real tablist', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Chatbot settings' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('shows only the selected panel', () => {
    render(<Harness />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Config panel');
    expect(screen.queryByText('Logs panel')).not.toBeInTheDocument();
  });

  it('uses roving tabindex — one tab stop for the whole set', () => {
    render(<Harness />);
    const [config, examples, logs] = screen.getAllByRole('tab');
    expect(config).toHaveAttribute('tabindex', '0');
    expect(examples).toHaveAttribute('tabindex', '-1');
    expect(logs).toHaveAttribute('tabindex', '-1');
  });

  it('moves between tabs with arrow keys', async () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');

    tabs[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Examples panel');

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Logs panel');
  });

  it('wraps at the ends and supports Home/End', async () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');

    tabs[0].focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Logs panel');

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Config panel');

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Logs panel');
  });

  it('links each panel back to its tab', () => {
    render(<Harness />);
    const panel = screen.getByRole('tabpanel');
    const selected = screen.getByRole('tab', { selected: true });
    expect(panel).toHaveAttribute('aria-labelledby', selected.id);
  });
});

// ─── Toast ───────────────────────────────────────────────────────────────────

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  /** Fires toasts from buttons, the way real editors do. */
  function Harness({ retry }: { retry?: () => void }) {
    const { success, error } = useToast();
    return (
      <>
        <button onClick={() => success('“Portfolio” saved — public site revalidated.')}>
          fire-success
        </button>
        <button onClick={() => success('Second')}>fire-second</button>
        <button
          onClick={() =>
            error('Save failed', {
              description: 'title: String must contain at most 200',
              retry,
            })
          }
        >
          fire-error
        </button>
      </>
    );
  }

  const renderWithToast = (retry?: () => void) =>
    render(
      <ToastProvider>
        <Harness retry={retry} />
      </ToastProvider>
    );

  it('shows a success toast naming what happened', async () => {
    renderWithToast();
    await user().click(screen.getByText('fire-success'));
    expect(screen.getByText(/saved — public site revalidated/)).toBeInTheDocument();
  });

  it('auto-dismisses success after 2.6s', async () => {
    renderWithToast();
    await user().click(screen.getByText('fire-success'));
    expect(screen.getByText(/saved/)).toBeInTheDocument();

    await React.act(async () => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByText(/saved/)).not.toBeInTheDocument();
  });

  it('keeps errors on screen — an error that vanishes is one nobody read', async () => {
    renderWithToast();
    await user().click(screen.getByText('fire-error'));

    await React.act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('surfaces the server message rather than a generic string', async () => {
    renderWithToast();
    await user().click(screen.getByText('fire-error'));
    expect(screen.getByText(/at most 200/)).toBeInTheDocument();
  });

  it('offers Retry on errors and dismisses after retrying', async () => {
    const retry = vi.fn();
    renderWithToast(retry);
    await user().click(screen.getByText('fire-error'));

    await user().click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Save failed')).not.toBeInTheDocument();
  });

  it('marks errors assertive so they interrupt', async () => {
    renderWithToast();
    await user().click(screen.getByText('fire-error'));
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('stacks multiple toasts', async () => {
    renderWithToast();
    const u = user();
    await u.click(screen.getByText('fire-success'));
    await u.click(screen.getByText('fire-error'));

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(within(region).getByText(/saved/)).toBeInTheDocument();
    expect(within(region).getByText('Save failed')).toBeInTheDocument();
  });

  it('can be dismissed manually', async () => {
    renderWithToast();
    await user().click(screen.getByText('fire-error'));
    await user().click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Save failed')).not.toBeInTheDocument();
  });

  it('throws a useful error when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/within <ToastProvider>/);
    spy.mockRestore();
  });
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

describe('Skeleton', () => {
  it('is hidden from assistive tech', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces loading once for a list, not per row', () => {
    render(<SkeletonList rows={5} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByText('Loading…')).toHaveLength(1);
  });
});
