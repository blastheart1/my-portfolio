/**
 * api-shape-safety.test.ts
 *
 * Regression guard for a crash class, not a single crash.
 *
 * The chatbot page did:
 *
 *     setConfigs(await res.json() as AIConfig[]);
 *
 * — no res.ok check and a cast. When the API returned 500 with `{ error }`,
 * that object reached `configs.map(...)` and threw
 * "configs.map is not a function", blanking the whole page. The same shape
 * assumption existed in all three tabs.
 *
 * A cast is a promise to the compiler, not a runtime check. These tests scan
 * for the pattern so it cannot come back somewhere new.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Client files that fetch from our own API. */
function clientFetchers(): { file: string; src: string }[] {
  return walk(SRC)
    .map(file => ({ file, src: readFileSync(file, 'utf8') }))
    .filter(({ src }) => src.includes("fetch('/api/") || src.includes('fetch(`/api/'));
}

describe('no unchecked array casts on fetched JSON', () => {
  it('never casts a response body straight into an array type', () => {
    // `await res.json() as Foo[]` is the exact shape that crashed.
    const offenders: string[] = [];

    for (const { file, src } of clientFetchers()) {
      const matches = src.match(/await\s+res\.json\(\)\s+as\s+\w+\[\]/g);
      if (matches) {
        offenders.push(`${path.relative(SRC, file)} (${matches.length})`);
      }
    }

    expect(
      offenders,
      'Cast a JSON body to an array and a 500 response object will reach ' +
        '.map(). Check res.ok and guard with Array.isArray() instead.\n' +
        offenders.join('\n')
    ).toEqual([]);
  });

  it('every client fetcher checks res.ok', () => {
    const offenders: string[] = [];

    for (const { file, src } of clientFetchers()) {
      const rel = path.relative(SRC, file);
      // Loaders delegate to useAdminFetch, which does the checking.
      if (src.includes('useAdminFetch')) continue;
      // Fire-and-forget mutations are handled case by case.
      if (!src.includes('.json()')) continue;

      // Any `<something>.ok` or an explicit status comparison counts — the
      // response variable is named r / res / response / uploadRes across the
      // codebase.
      const checksOk = /\w+\.ok\b|\.status\s*[=!]==/.test(src);
      if (!checksOk) offenders.push(rel);
    }

    expect(
      offenders,
      'These read a JSON body without checking whether the request succeeded:\n' +
        offenders.join('\n')
    ).toEqual([]);
  });
});

describe('the chatbot page specifically', () => {
  const src = readFileSync(path.join(SRC, 'app/edit/chatbot/page.tsx'), 'utf8');

  it('guards every list with Array.isArray before setting state', () => {
    for (const setter of ['setConfigs', 'setExamples', 'setConversations']) {
      // The load path must not hand a non-array to state.
      const guarded = new RegExp(`${setter}\\(Array\\.isArray\\(`).test(src);
      expect(guarded, `${setter} is not Array.isArray-guarded`).toBe(true);
    }
  });

  it('throws on a failed response rather than casting the error body', () => {
    expect(src).toMatch(/if \(!res\.ok\) throw new Error/);
  });

  it('surfaces the failure instead of rendering an empty tab', () => {
    // An empty tab after a 500 is indistinguishable from "no data yet".
    expect(src).toContain('TabError');
    expect(src).toMatch(/if \(error\) return <TabError/);
  });

  it('prefers the server message over a generic string', () => {
    expect(src).toMatch(/data\?\.error \?\?/);
  });
});

describe('admin loaders route through the shared hook', () => {
  // ClientContentEditor is the fifth: it loads data like the others but is
  // named for what it renders rather than for loading.
  const loaders = walk(path.join(SRC, 'app/edit')).filter(f =>
    /Client\w*(Loader|ContentEditor)\.tsx$/.test(f)
  );

  it('finds all five loaders', () => {
    expect(
      loaders.map(f => path.basename(f)).sort(),
      'A loader was added or renamed — keep this list in sync.'
    ).toEqual([
      'ClientContentEditor.tsx',
      'ClientExperienceLoader.tsx',
      'ClientImagesLoader.tsx',
      'ClientProjectsLoader.tsx',
      'ClientServicesLoader.tsx',
    ]);
  });

  it('none of them hand-rolls fetch state any more', () => {
    for (const file of loaders) {
      const src = readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file);

      expect(src, rel).toContain('useAdminFetch');
      // The old pattern collapsed every failure into an empty list.
      expect(src, `${rel} still swallows errors into an empty array`).not.toMatch(
        /catch\s*\(\s*\)\s*=>\s*set\w+\(\[\]\)/
      );
    }
  });
});
