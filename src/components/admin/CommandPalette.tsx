'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  NAV_ITEMS,
  CONTENT_SECTIONS,
  NAV_GROUP_LABELS,
} from '@/lib/admin-nav';
import { cn } from '@/lib/utils';

/**
 * Command palette (Cmd/Ctrl-K).
 *
 * Plain React — no cmdk, per the brief. Sources are the seven pages, the eight
 * content sections, and a few global actions. Substring match, arrow keys to
 * move, Enter to run, Escape to close.
 */

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Extra commands contributed by the current page. */
  extraCommands?: Command[];
}

export default function CommandPalette({
  open,
  onOpenChange,
  extraCommands = [],
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listId = React.useId();

  const commands = React.useMemo<Command[]>(() => {
    const navCommands: Command[] = NAV_ITEMS.map(item => ({
      id: `nav:${item.href}`,
      label: item.label,
      hint: item.group ? NAV_GROUP_LABELS[item.group] : 'Go to',
      run: () => router.push(item.href),
    }));

    const sectionCommands: Command[] = CONTENT_SECTIONS.map(section => ({
      id: `content:${section}`,
      label: `Edit ${section} content`,
      hint: 'Content',
      run: () => router.push(`/edit/content/${section}`),
    }));

    const actions: Command[] = [
      {
        id: 'action:theme',
        label: 'Toggle theme',
        hint: 'Action',
        run: () => {
          const html = document.documentElement;
          const next = !html.classList.contains('dark');
          html.classList.toggle('dark', next);
          localStorage.setItem('theme', next ? 'dark' : 'light');
        },
      },
      {
        id: 'action:view-site',
        label: 'View public site',
        hint: 'Action',
        run: () => window.open('/', '_blank', 'noopener,noreferrer'),
      },
    ];

    return [...navCommands, ...sectionCommands, ...actions, ...extraCommands];
  }, [router, extraCommands]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset when reopening; a stale query is never what you want.
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after paint so the input exists.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const run = React.useCallback(
    (command: Command) => {
      onOpenChange(false);
      command.run();
    },
    [onOpenChange]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i =>
        results.length === 0 ? 0 : (i - 1 + results.length) % results.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const command = results[activeIndex];
      if (command) run(command);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[15vh]">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-admin-fade-up relative w-full max-w-lg overflow-hidden rounded-xl
                   border border-border bg-card shadow-xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search pages and actions…"
          aria-label="Search pages and actions"
          aria-controls={listId}
          aria-activedescendant={
            results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined
          }
          role="combobox"
          aria-expanded="true"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm
                     outline-none placeholder:text-muted-foreground"
        />

        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Results"
          className="max-h-72 overflow-y-auto p-1"
        >
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches
            </li>
          )}

          {results.map((command, i) => (
            <li
              key={command.id}
              id={`${listId}-${command.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => run(command)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm',
                i === activeIndex ? 'bg-secondary text-foreground' : 'text-muted-foreground'
              )}
            >
              <span className="truncate">{command.label}</span>
              {command.hint && (
                <span className="shrink-0 text-[11px] text-muted-foreground">{command.hint}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
