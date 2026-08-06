/**
 * useReorder.test.ts
 *
 * Phase 5 — reordering.
 *
 * `sort_order` is a real column every read path orders by, and
 * /edit/projects claimed "drag order is controlled by sort_order" while no
 * drag existed. These cover the pure logic; the keyboard and live-region
 * behaviour is covered in the ProjectsEditor suite.
 */

import { describe, it, expect } from 'vitest';
import { moveItem, changedPositions } from '../useReorder';

const items = [
  { id: 'a', title: 'A' },
  { id: 'b', title: 'B' },
  { id: 'c', title: 'C' },
  { id: 'd', title: 'D' },
];

describe('moveItem', () => {
  it('moves an item down', () => {
    expect(moveItem(items, 0, 2).map(i => i.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item up', () => {
    expect(moveItem(items, 3, 1).map(i => i.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves to the top and bottom', () => {
    expect(moveItem(items, 2, 0).map(i => i.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveItem(items, 0, 3).map(i => i.id)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('is a no-op when the position does not change', () => {
    expect(moveItem(items, 1, 1).map(i => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not mutate the input', () => {
    const before = items.map(i => i.id);
    moveItem(items, 0, 3);
    expect(items.map(i => i.id)).toEqual(before);
  });

  it('ignores out-of-range indices instead of corrupting the list', () => {
    expect(moveItem(items, -1, 2).map(i => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(moveItem(items, 0, 99).map(i => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles a single-item list', () => {
    const one = [{ id: 'a' }];
    expect(moveItem(one, 0, 0)).toEqual(one);
  });
});

describe('changedPositions', () => {
  it('returns only the rows whose index actually changed', () => {
    const after = moveItem(items, 0, 1); // b, a, c, d
    const changes = changedPositions(items, after);

    // c and d did not move, so they must not be PATCHed.
    expect(changes.map(c => c.id).sort()).toEqual(['a', 'b']);
  });

  it('assigns the new index as sort_order', () => {
    const after = moveItem(items, 0, 2); // b, c, a, d
    const changes = changedPositions(items, after);

    expect(changes).toContainEqual({ id: 'a', sort_order: 2 });
    expect(changes).toContainEqual({ id: 'b', sort_order: 0 });
    expect(changes).toContainEqual({ id: 'c', sort_order: 1 });
  });

  it('returns nothing when the order is unchanged', () => {
    expect(changedPositions(items, items)).toEqual([]);
  });

  it('reports every row when the list is reversed', () => {
    const reversed = [...items].reverse();
    expect(changedPositions(items, reversed)).toHaveLength(4);
  });

  it('treats a newly added row as changed', () => {
    const after = [...items, { id: 'e', title: 'E' }];
    const changes = changedPositions(items, after);
    expect(changes).toContainEqual({ id: 'e', sort_order: 4 });
  });

  it('a move of one item in a long list touches only the span between', () => {
    const long = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const after = moveItem(long, 8, 6);

    // Items 0–5 and 9 keep their positions.
    const ids = changedPositions(long, after).map(c => c.id).sort();
    expect(ids).toEqual(['6', '7', '8']);
  });
});
