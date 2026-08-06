'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Reordering for admin lists.
 *
 * `sort_order` is a real column that every read path orders by, and
 * /edit/projects even told the owner "drag order is controlled by sort_order"
 * — but no drag existed and there was no other way to change it.
 *
 * Deliberately dependency-free (no dnd-kit, per the brief) and deliberately
 * keyboard-operable: drag-only reordering is unusable without a mouse, and
 * this is a tool one person uses to edit their own site.
 *
 * Persistence is left to the caller so each entity can use its own endpoint —
 * sections have a bulk `{ order: string[] }` PATCH, projects and services take
 * per-record `PATCH { sort_order }`.
 */

export interface ReorderableItem {
  id: string;
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items.slice();
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Indices whose position changed between two orderings.
 * Used to PATCH only the rows that actually moved.
 */
export function changedPositions<T extends ReorderableItem>(
  before: readonly T[],
  after: readonly T[]
): { id: string; sort_order: number }[] {
  const previous = new Map(before.map((item, i) => [item.id, i]));
  return after
    .map((item, i) => ({ id: item.id, sort_order: i }))
    .filter(({ id, sort_order }) => previous.get(id) !== sort_order);
}

interface UseReorderOptions<T extends ReorderableItem> {
  items: T[];
  /** Persist the new ordering. Called only with rows whose position changed. */
  onPersist: (changes: { id: string; sort_order: number }[], next: T[]) => Promise<void>;
  /** Human label for the announcement, e.g. item => item.title */
  describe: (item: T) => string;
}

export function useReorder<T extends ReorderableItem>({
  items,
  onPersist,
  describe,
}: UseReorderOptions<T>) {
  const [announcement, setAnnouncement] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Snapshot for rollback if persistence fails.
  const lastCommitted = useRef<T[]>(items);

  const commit = useCallback(
    async (next: T[], movedIndex: number) => {
      const before = lastCommitted.current;
      const changes = changedPositions(before, next);
      if (changes.length === 0) return;

      setAnnouncement(
        `Moved ${describe(next[movedIndex])} to position ${movedIndex + 1} of ${next.length}`
      );

      lastCommitted.current = next;
      await onPersist(changes, next);
    },
    [describe, onPersist]
  );

  const move = useCallback(
    (from: number, to: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, to));
      if (clamped === from) return;
      void commit(moveItem(items, from, clamped), clamped);
    },
    [items, commit]
  );

  const moveUp = useCallback((index: number) => move(index, index - 1), [move]);
  const moveDown = useCallback((index: number) => move(index, index + 1), [move]);
  const moveToTop = useCallback((index: number) => move(index, 0), [move]);
  const moveToBottom = useCallback(
    (index: number) => move(index, items.length - 1),
    [move, items.length]
  );

  /** Arrow-key handler for a row's drag handle. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveUp(index);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveDown(index);
      } else if (e.key === 'Home') {
        e.preventDefault();
        moveToTop(index);
      } else if (e.key === 'End') {
        e.preventDefault();
        moveToBottom(index);
      }
    },
    [moveUp, moveDown, moveToTop, moveToBottom]
  );

  const dragHandlers = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: () => setDragIndex(index),
      onDragEnd: () => setDragIndex(null),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null) move(dragIndex, index);
        setDragIndex(null);
      },
    }),
    [dragIndex, move]
  );

  return {
    announcement,
    dragIndex,
    move,
    moveUp,
    moveDown,
    moveToTop,
    moveToBottom,
    handleKeyDown,
    dragHandlers,
  };
}
