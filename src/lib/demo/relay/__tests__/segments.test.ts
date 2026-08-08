/**
 * segments.test.ts
 *
 * Whisper returns one segment per breath — dozens for a minute of speech. Shown
 * raw they read as a wall of near-empty rows, so they are merged into ~13
 * second chunks. Each chunk keeps its start in seconds, which is what makes a
 * timestamp clickable.
 */

import { describe, it, expect } from 'vitest';

import { groupSegments, formatClock } from '../segments';
import { SEED_NOTES } from '../seed';

describe('formatClock', () => {
  it('formats seconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(61)).toBe('1:01');
    expect(formatClock(600)).toBe('10:00');
  });

  it('floors fractional seconds rather than rounding up past the audio', () => {
    expect(formatClock(9.87)).toBe('0:09');
  });

  it('never renders a negative clock', () => {
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('grouping', () => {
  it('merges fine-grained segments into readable chunks', () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({ start: i * 3, text: `part ${i}` }));

    const grouped = groupSegments(raw);

    // 30 seconds of 3-second segments at a 13-second target: far fewer rows.
    expect(grouped.length).toBeLessThan(raw.length);
    expect(grouped.length).toBeGreaterThan(1);
  });

  it('keeps every word, in order', () => {
    const raw = [
      { start: 0, text: 'one' },
      { start: 5, text: 'two' },
      { start: 20, text: 'three' },
      { start: 40, text: 'four' },
    ];

    const joined = groupSegments(raw)
      .map(s => s.text)
      .join(' ');

    expect(joined).toBe('one two three four');
  });

  it('starts the first chunk at the first segment, not at zero', () => {
    const grouped = groupSegments([
      { start: 7, text: 'late start' },
      { start: 30, text: 'later' },
    ]);

    expect(grouped[0].start).toBe(7);
    expect(grouped[0].time).toBe('0:07');
  });

  it('carries a numeric start alongside the label, for seeking', () => {
    const grouped = groupSegments([{ start: 65, text: 'x' }]);

    expect(grouped[0]).toMatchObject({ start: 65, time: '1:05' });
  });

  it('drops empty text rather than emitting blank rows', () => {
    const grouped = groupSegments([
      { start: 0, text: '   ' },
      { start: 2, text: 'real' },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].text).toBe('real');
  });

  it('returns nothing for no input, rather than one empty chunk', () => {
    expect(groupSegments([])).toEqual([]);
  });

  it('handles a single segment shorter than the target window', () => {
    expect(groupSegments([{ start: 0, text: 'brief' }])).toEqual([
      { start: 0, time: '0:00', text: 'brief' },
    ]);
  });
});

describe('seeded notes look the same as a real recording', () => {
  it('every seeded note carries segments', () => {
    for (const note of SEED_NOTES) {
      expect(note.segments, note.id).toBeDefined();
      expect(note.segments!.length).toBeGreaterThan(1);
    }
  });

  it('segment text reconstructs the full transcript', () => {
    for (const note of SEED_NOTES) {
      const joined = note.segments!.map(s => s.text).join(' ');
      // Guards against a segment being edited without its transcript, which
      // would send the model different words from the ones on screen.
      expect(joined.replace(/\s+/g, ' ')).toBe(note.transcript.replace(/\s+/g, ' '));
    }
  });

  it('timestamps increase', () => {
    for (const note of SEED_NOTES) {
      const starts = note.segments!.map(s => s.start);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    }
  });

  it('labels agree with their numeric start', () => {
    for (const note of SEED_NOTES) {
      for (const segment of note.segments!) {
        expect(segment.time).toBe(formatClock(segment.start));
      }
    }
  });
});
