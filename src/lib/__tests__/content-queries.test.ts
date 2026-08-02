/**
 * content-queries.test.ts
 *
 * Guard rail P4 — / must still render when the database is unreachable.
 *
 * Every getter used by src/app/page.tsx swallows DB errors and returns a
 * documented fallback. That behaviour is load-bearing: page.tsx awaits nine of
 * these in a Promise.all, so a single unhandled rejection would fail the whole
 * render. It matters more now that / is statically generated — a Neon blip
 * during a build or revalidation must degrade to sensible defaults rather than
 * poison the cached page.
 *
 * These tests force getSql() to throw and assert each fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// getSql is called inside each query, so mocking the module is enough to
// simulate a database that is down or unconfigured.
vi.mock('../neon', () => ({
  getSql: () => {
    throw new Error('DATABASE_URL environment variable is not set');
  },
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('P4 — fallbacks when the database is unavailable', () => {
  it('getSectionVisibility returns every section visible', async () => {
    const { getSectionVisibility } = await import('../content-queries');
    const visibility = await getSectionVisibility();

    // page.tsx does `visibility[id] !== false`, so the safe default is "show".
    // Returning {} would also work, but an explicit map documents intent.
    expect(visibility).toEqual({
      hero: true,
      about: true,
      experience: true,
      skills: true,
      projects: true,
      services: true,
      blog: true,
      contact: true,
    });
  });

  it('getSectionContent returns an empty record', async () => {
    const { getSectionContent } = await import('../content-queries');
    await expect(getSectionContent('hero')).resolves.toEqual({});
  });

  it('getExperienceEntries returns an empty list', async () => {
    const { getExperienceEntries } = await import('../content-queries');
    await expect(getExperienceEntries()).resolves.toEqual([]);
  });

  it('getServiceTiers returns an empty list', async () => {
    const { getServiceTiers } = await import('../content-queries');
    await expect(getServiceTiers()).resolves.toEqual([]);
  });

  it('getProjects returns an empty list', async () => {
    const { getProjects } = await import('../content-queries');
    await expect(getProjects()).resolves.toEqual([]);
  });

  it('getAllSectionHeadings returns an empty record', async () => {
    const { getAllSectionHeadings } = await import('../content-queries');
    await expect(getAllSectionHeadings()).resolves.toEqual({});
  });

  it('getSplashEnabled defaults to on', async () => {
    const { getSplashEnabled } = await import('../content-queries');
    await expect(getSplashEnabled()).resolves.toBe(true);
  });

  it('getSplashVersion defaults to 1', async () => {
    const { getSplashVersion } = await import('../content-queries');
    await expect(getSplashVersion()).resolves.toBe(1);
  });

  it('getMediaAsset returns null rather than throwing', async () => {
    const { getMediaAsset } = await import('../content-queries');
    await expect(getMediaAsset('profile')).resolves.toBeNull();
  });

  it('getAllMediaAssets returns an empty list', async () => {
    const { getAllMediaAssets } = await import('../content-queries');
    await expect(getAllMediaAssets()).resolves.toEqual([]);
  });
});

describe('P4 — the whole page query set survives a total outage', () => {
  it('resolves every getter page.tsx awaits, with no rejection', async () => {
    const q = await import('../content-queries');

    // Mirrors the Promise.all in src/app/page.tsx. If any of these rejected,
    // the page render would fail outright instead of degrading.
    const results = await Promise.all([
      q.getExperienceEntries(),
      q.getServiceTiers(),
      q.getSectionContent('hero'),
      q.getSectionContent('about'),
      q.getSectionVisibility(),
      q.getSplashEnabled(),
      q.getSplashVersion(),
      q.getAllSectionHeadings(),
      q.getProjects(),
    ]);

    expect(results).toHaveLength(9);
    expect(results.every(r => r !== undefined)).toBe(true);
  });
});

describe('admin-only getters intentionally propagate errors', () => {
  // These back the /edit screens, where a silent empty list would look like
  // "you have no projects" and invite the user to recreate everything.
  // Failing loudly there is correct.
  it('getAllProjects rejects', async () => {
    const { getAllProjects } = await import('../content-queries');
    await expect(getAllProjects()).rejects.toThrow();
  });

  it('getAllSections rejects', async () => {
    const { getAllSections } = await import('../content-queries');
    await expect(getAllSections()).rejects.toThrow();
  });

  it('getAllExperienceEntries rejects', async () => {
    const { getAllExperienceEntries } = await import('../content-queries');
    await expect(getAllExperienceEntries()).rejects.toThrow();
  });

  it('getAllServiceTiers rejects', async () => {
    const { getAllServiceTiers } = await import('../content-queries');
    await expect(getAllServiceTiers()).rejects.toThrow();
  });
});
