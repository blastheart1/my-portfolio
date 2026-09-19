/**
 * Blog slugs.
 *
 * A slug is a permanent identifier, not a derived display value. Once a post
 * has a URL and that URL is indexed or linked, regenerating the slug from a
 * changed title breaks it. So these functions run exactly once per post, at
 * insert time, and nothing updates the column afterwards — guard rail N16.
 *
 * Deliberately pure, with no database access. The same logic has to run in two
 * places: the TypeScript insert path, and the one-off backfill over rows that
 * predate the column. If it read from anywhere, those two could disagree, and
 * a disagreement here means a duplicate or a 404.
 */

/** Longest slug we will emit. Long enough to stay readable, short enough for a URL. */
export const MAX_SLUG_LENGTH = 72;

/**
 * Normalises a title into slug form.
 *
 * Returns an empty string when a title has no ASCII-representable content —
 * an emoji-only, CJK-only or punctuation-only title. That case is real: the
 * generator is a language model, and "🔎 Case Study" is exactly the sort of
 * title it has produced. Callers must use `buildSlug`, which handles it;
 * this function returning '' rather than guessing is the point.
 */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    // Strip combining marks left behind by the decomposition, so "café"
    // becomes "cafe" rather than "caf".
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Apostrophes are dropped rather than turned into a gap, so "Can't"
    // becomes "cant" and not "can-t". They join a word to itself; every other
    // punctuation mark separates two words.
    .replace(/['\u2019]/g, '')
    // Anything else that is not an ASCII letter, digit or space becomes a gap.
    // Doing this rather than deleting it keeps "AI/ML" as "ai-ml" instead of
    // collapsing it to "aiml".
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    // The slice can leave a trailing hyphen when it lands mid-gap.
    .replace(/-+$/g, '');
}

/**
 * A slug for a post, guaranteed non-empty.
 *
 * Falls back to an id-derived value when the title yields nothing. The fallback
 * must incorporate the id rather than being a constant: a constant would make
 * every untitleable post collide with every other, which `uniqueSlug` would
 * then paper over with -2, -3, -4 suffixes that mean nothing to a reader and
 * shift if rows are ever reprocessed in a different order.
 */
export function buildSlug(title: string, id: string): string {
  const fromTitle = slugify(title);
  if (fromTitle) return fromTitle;

  const fromId = slugify(id).slice(0, 12).replace(/-+$/g, '');
  return fromId ? `post-${fromId}` : 'post';
}

/**
 * Disambiguates a slug against those already assigned.
 *
 * Suffixes are `-2`, `-3`, … because `-1` reads as "the first of several" when
 * the unsuffixed slug is in fact that one. The base is trimmed so the result
 * still respects MAX_SLUG_LENGTH.
 *
 * `taken` is passed in rather than queried so this stays pure and the caller
 * decides what "already assigned" means — the backfill accumulates as it goes,
 * the insert path reads the column.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;

  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const trimmed = base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '');
    const candidate = `${trimmed}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** True when a value is usable as a slug: non-empty, lowercase, URL-safe. */
export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_SLUG_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}
