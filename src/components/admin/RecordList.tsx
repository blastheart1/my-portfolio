'use client';

import * as React from 'react';
import { GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared list chrome for the repeatable admin entities.
 *
 * Carries the reordering affordances the brief requires (§3.5): a focusable
 * drag handle that also responds to arrow keys, a visible position number, and
 * a polite live region announcing moves — so reordering is not mouse-only.
 */

export function RecordList({
  children,
  announcement,
  className,
}: {
  children: React.ReactNode
  /** Live-region text from useReorder. */
  announcement?: string
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Single polite region for the whole list — one announcement per move,
          rather than every row shouting. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

interface RecordRowProps {
  /** 1-based position shown to the user. */
  position: number;
  total: number;
  label: string;
  children: React.ReactNode;
  /** Omit to render a non-reorderable row (e.g. date-sorted experience). */
  reorder?: {
    onKeyDown: (e: React.KeyboardEvent, index: number) => void
    dragHandlers: (index: number) => Record<string, unknown>
    index: number
    isDragging?: boolean
  }
  dimmed?: boolean
  className?: string
}

export function RecordRow({
  position,
  total,
  label,
  children,
  reorder,
  dimmed,
  className,
}: RecordRowProps) {
  return (
    <li
      {...(reorder ? reorder.dragHandlers(reorder.index) : {})}
      className={cn(
        'rounded-lg border border-border bg-card transition-opacity',
        reorder?.isDragging && 'opacity-50',
        dimmed && 'opacity-60',
        className
      )}
    >
      <div className="flex items-start gap-2 p-3">
        {reorder && (
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onKeyDown={e => reorder.onKeyDown(e, reorder.index)}
              aria-label={`Reorder ${label}. Position ${position} of ${total}. Use arrow keys to move.`}
              className="cursor-grab rounded p-1 text-muted-foreground transition-colors
                         hover:bg-secondary hover:text-foreground active:cursor-grabbing
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
            <span
              aria-hidden="true"
              className="w-5 text-right font-mono text-xs tabular-nums text-muted-foreground"
            >
              {position}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  );
}
