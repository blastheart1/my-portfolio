/**
 * demo-visibility.test.ts
 *
 * The home page resolves visibility as `visibility[id] !== false`, which treats
 * an unknown section as visible. That is the right default for editorial
 * sections — a database hiccup should not blank the About copy.
 *
 * It is the wrong default for the demos. They call paid providers, and
 * getSectionVisibility()'s error fallback lists only the eight original
 * sections, so during a Neon outage `visibility['demo_relay']` is undefined,
 * `undefined !== false` is true, and the demos would go live precisely when the
 * database that holds their quota counters is unreachable.
 *
 * Demo sections resolve the other way: absent, unreadable, or unknown all mean
 * hidden.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('@/lib/neon', () => ({ getSql: () => sqlMock }));

import { isDemoVisible, DEMO_SECTION_IDS, getSectionVisibility } from '../content-queries';

beforeEach(() => {
  sqlMock.mockReset();
});

/**
 * Stands in for the sections table.
 *
 * The tagged template is called as sql(strings, ...values), so a single-id
 * lookup arrives with the id as the first value. Filtering on it matters: a
 * mock that returns every row regardless of the WHERE clause would let a
 * `rows[0]` bug pass, since the first row would usually happen to be the right
 * one.
 */
function rows(...entries: Array<[string, boolean]>) {
  const table = entries.map(([id, visible]) => ({ id, visible }));
  sqlMock.mockImplementation((_strings: TemplateStringsArray, ...values: unknown[]) => {
    const id = values[0];
    return Promise.resolve(id === undefined ? table : table.filter(r => r.id === id));
  });
}

describe('happy path', () => {
  it('shows a demo whose row says visible', async () => {
    rows(['demo_relay', true]);

    await expect(isDemoVisible('demo_relay')).resolves.toBe(true);
  });

  it('hides a demo whose row says hidden', async () => {
    rows(['demo_relay', false]);

    await expect(isDemoVisible('demo_relay')).resolves.toBe(false);
  });

  it('resolves each demo independently', async () => {
    rows(['demo_relay', true], ['automation_lab', false]);

    await expect(isDemoVisible('demo_relay')).resolves.toBe(true);
    await expect(isDemoVisible('automation_lab')).resolves.toBe(false);
  });
});

describe('fails closed', () => {
  it('hides the demo when the database throws', async () => {
    sqlMock.mockRejectedValue(new Error('connection terminated'));

    await expect(isDemoVisible('demo_relay')).resolves.toBe(false);
  });

  it('hides the demo when its row is missing entirely', async () => {
    rows(['hero', true], ['about', true]);

    await expect(isDemoVisible('demo_relay')).resolves.toBe(false);
  });

  it('hides an id that is not a known demo', async () => {
    rows(['anything', true]);

    await expect(isDemoVisible('not_a_demo')).resolves.toBe(false);
  });

  it('hides every demo on a database failure, not just one', async () => {
    sqlMock.mockRejectedValue(new Error('down'));

    for (const id of DEMO_SECTION_IDS) {
      await expect(isDemoVisible(id)).resolves.toBe(false);
    }
  });
});

describe('the editorial fallback still fails open', () => {
  it('keeps the original sections visible when the database is down', async () => {
    sqlMock.mockRejectedValue(new Error('down'));

    const visibility = await getSectionVisibility();

    // A DB outage must not blank the site's actual content.
    expect(visibility.about).toBe(true);
    expect(visibility.projects).toBe(true);
  });

  it('lists the demo ids as false rather than omitting them', async () => {
    sqlMock.mockRejectedValue(new Error('down'));

    const visibility = await getSectionVisibility();

    // Spelled out so the intent is readable, instead of relying on absence
    // plus a `!== false` check elsewhere to accidentally do the right thing.
    for (const id of DEMO_SECTION_IDS) {
      expect(visibility[id]).toBe(false);
    }
  });
});
