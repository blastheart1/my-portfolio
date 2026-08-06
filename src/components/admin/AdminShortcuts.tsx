'use client';

import * as React from 'react';

import { Dialog } from '@/components/ui/dialog';
import CommandPalette from './CommandPalette';

/**
 * Keyboard shortcuts for the admin surface (§4.3).
 *
 * Mounted once at the layout level rather than per page.
 *
 *   Cmd/Ctrl-K  command palette
 *   Cmd/Ctrl-B  collapse/expand the sidebar
 *   ?           this cheat sheet
 *   Escape      close whatever is open
 *
 * Cmd-S (save) and N (new record) are intentionally handled by the pages that
 * own a form or a list — a global handler would have to guess which form.
 */

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '⌘K / Ctrl-K', description: 'Open the command palette' },
  { keys: '⌘B / Ctrl-B', description: 'Collapse or expand the sidebar' },
  { keys: '⌘S / Ctrl-S', description: 'Save the form you are editing' },
  { keys: '⌘↵', description: 'Save from inside a textarea' },
  { keys: 'N', description: 'New record on a list page' },
  { keys: 'Esc', description: 'Close a dialog, drawer, or form' },
  { keys: '?', description: 'Show this list' },
];

/** True when focus is in a field, so single-key shortcuts must not fire. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export default function AdminShortcuts() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }

      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        // The sidebar owns its own state; this is the cross-component signal.
        window.dispatchEvent(new CustomEvent('admin:toggle-sidebar'));
        return;
      }

      // Single-key shortcuts must never steal a character mid-typing.
      if (isTypingTarget(e.target)) return;

      if (e.key === '?') {
        e.preventDefault();
        setCheatSheetOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Dialog
        open={cheatSheetOpen}
        onOpenChange={setCheatSheetOpen}
        title="Keyboard shortcuts"
      >
        <dl className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{s.description}</dt>
              <dd>
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px]">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </>
  );
}
