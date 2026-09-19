/**
 * slug.test.ts
 *
 * Guard rail:
 *   N16 — no slug may be empty, non-unique, or modified after it is written
 *
 * A slug is a permanent URL. The failure modes worth pinning are not the happy
 * path but the degenerate titles a language model actually produces: emoji,
 * punctuation-only, and near-identical titles differing only in a comma. Each
 * of those, handled naively, yields either an empty slug or a collision, and
 * both mean a broken or duplicated URL once the page is indexed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { buildSlug, isValidSlug, MAX_SLUG_LENGTH, slugify, uniqueSlug } from '../slug';

const SRC = path.resolve(__dirname, '../../..');

describe('slugify', () => {
  it('lowercases, and joins words with single hyphens', () => {
    expect(slugify('Choosing Between Rules And Models')).toBe(
      'choosing-between-rules-and-models'
    );
  });

  it('is deterministic', () => {
    const title = 'Decision Automation at Scale';
    expect(slugify(title)).toBe(slugify(title));
  });

  it('folds accents to ASCII rather than dropping the letter', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('turns punctuation into a gap, not a deletion', () => {
    // "aiml" would be wrong: these are two terms, not one.
    expect(slugify('AI/ML in Production')).toBe('ai-ml-in-production');
  });

  it('drops apostrophes rather than splitting the word around them', () => {
    // "can-t" and "what-s" were the first real titles to hit this, and both
    // read as a typo in the URL bar.
    expect(slugify("You Can't Have All Four")).toBe('you-cant-have-all-four');
    expect(slugify("What's Next \u2014 Really?")).toBe('whats-next-really');
    expect(slugify('It\u2019s Not About Intelligence')).toBe('its-not-about-intelligence');
  });

  it('collapses runs of separators and trims the ends', () => {
    expect(slugify('  ...Hello,,,   World!!!  ')).toBe('hello-world');
  });

  it('caps length and never leaves a trailing hyphen', () => {
    const slug = slugify('a'.repeat(40) + ' ' + 'b'.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('caps a 300-character title without producing an invalid slug', () => {
    const slug = slugify('Why '.repeat(75));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(isValidSlug(slug)).toBe(true);
  });

  // The degenerate cases. Each returns '' by design; buildSlug is what makes
  // that safe. A slugify that guessed here would hide the problem.
  it.each([
    ['empty', ''],
    ['emoji only', '🔎'],
    ['punctuation only', '---'],
    ['symbols only', '!!! ??? ...'],
    ['CJK only', '日本語のタイトル'],
  ])('returns an empty string for a %s title', (_label, title) => {
    expect(slugify(title)).toBe('');
  });
});

describe('buildSlug', () => {
  it('uses the title when the title yields anything', () => {
    expect(buildSlug('A Real Title Here', 'abc-123')).toBe('a-real-title-here');
  });

  it.each([
    ['empty', ''],
    ['emoji only', '🔎'],
    ['punctuation only', '---'],
    ['CJK only', '日本語のタイトル'],
  ])('falls back to an id-derived slug for a %s title', (_label, title) => {
    const slug = buildSlug(title, 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(slug).not.toBe('');
    expect(isValidSlug(slug)).toBe(true);
  });

  it('gives two untitleable posts DIFFERENT slugs', () => {
    // The whole reason the fallback incorporates the id. A constant fallback
    // would make every such post collide, and the -2/-3 suffixes papering
    // over it would shift if rows were ever reprocessed in another order.
    const a = buildSlug('🔎', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    const b = buildSlug('🔎', '9c8e7d6a-1111-2222-3333-444455556666');
    expect(a).not.toBe(b);
  });

  it('still returns a usable slug when the id is also unrepresentable', () => {
    expect(isValidSlug(buildSlug('', '🔎'))).toBe(true);
  });
});

describe('uniqueSlug', () => {
  it('returns the base untouched when nothing has taken it', () => {
    expect(uniqueSlug('a-title', new Set())).toBe('a-title');
  });

  it('suffixes from -2, because the unsuffixed slug is already the first', () => {
    expect(uniqueSlug('a-title', new Set(['a-title']))).toBe('a-title-2');
    expect(uniqueSlug('a-title', new Set(['a-title', 'a-title-2']))).toBe('a-title-3');
  });

  it('keeps the suffixed result within the length cap', () => {
    const base = 'x'.repeat(MAX_SLUG_LENGTH);
    const taken = new Set([base]);
    const result = uniqueSlug(base, taken);
    expect(result.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(isValidSlug(result)).toBe(true);
  });

  it('gives distinct slugs to titles differing only in punctuation', () => {
    // These slugify identically, which is exactly when a unique index bites.
    const a = slugify('Rules, Models, and Cost');
    const b = slugify('Rules Models and Cost');
    expect(a).toBe(b);

    const taken = new Set<string>();
    const first = uniqueSlug(a, taken);
    taken.add(first);
    const second = uniqueSlug(b, taken);

    expect(second).not.toBe(first);
  });

  it('assigns a whole batch without repeating itself', () => {
    const titles = ['Same Title', 'Same Title', 'Same Title!', 'Other'];
    const taken = new Set<string>();
    const slugs = titles.map(t => {
      const slug = uniqueSlug(buildSlug(t, 'id'), taken);
      taken.add(slug);
      return slug;
    });

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every(isValidSlug)).toBe(true);
  });
});

describe('isValidSlug', () => {
  it.each(['a', 'a-b', 'post-2', 'a1-b2-c3'])('accepts %s', value => {
    expect(isValidSlug(value)).toBe(true);
  });

  it.each([
    '',
    '-leading',
    'trailing-',
    'double--hyphen',
    'Upper',
    'with space',
    'with/slash',
    '../traversal',
    'x'.repeat(MAX_SLUG_LENGTH + 1),
  ])('rejects %j', value => {
    expect(isValidSlug(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(42)).toBe(false);
  });
});

/**
 * N16's second half. The functions above can only guarantee a good slug at
 * insert time; this is what stops a later edit path from changing one.
 */
describe('N16 — a slug is never rewritten after it is assigned', () => {
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next') continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
  }

  it('no source file issues an update that writes the slug column', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      if (file.includes('__tests__')) continue;
      const src = readFileSync(file, 'utf8');

      // Supabase writes go through .update({...}); a slug key inside one is
      // the shape this forbids. Also catches a raw SQL "SET slug =".
      for (const match of src.matchAll(/\.update\s*\(\s*\{[^}]*\}/g)) {
        if (/\bslug\b\s*:/.test(match[0])) {
          offenders.push(path.relative(SRC, file));
        }
      }
      if (/set\s+slug\s*=/i.test(src)) offenders.push(path.relative(SRC, file));
    }

    expect(
      offenders,
      'A slug is a permanent URL. Rewriting one breaks every link and index ' +
        'entry pointing at the old value. Assign it once in insertBlogPost ' +
        'and never again:\n' + offenders.join('\n')
    ).toEqual([]);
  });
});
