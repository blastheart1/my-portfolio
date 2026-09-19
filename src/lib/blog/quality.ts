import { z } from 'zod';

/**
 * The deterministic half of the publish gate.
 *
 * Everything here is pure and offline: schema shape, banned phrasing, length
 * floors and ceilings, and duplicate detection. It runs before the model audit
 * because it is free, instant, and catches the failures that actually recur —
 * a truncated reply, the generator's own fallback disclaimer, a post that
 * restates last week's post under a new title.
 *
 * Lives here rather than in src/lib/schemas/ on purpose. Those schemas are
 * shared between API routes and admin forms and are explicitly frozen to the
 * shapes the routes already accepted. This one is a gate, not a contract: it
 * is meant to get stricter over time, and tightening it must not drag an admin
 * form along with it.
 *
 * Each rejection carries a named reason. A gate that returns only false is one
 * nobody can debug at 3am when the cron has silently published nothing for a
 * week.
 */

/** Content length bounds, in words. */
export const MIN_CONTENT_WORDS = 250;
export const MAX_CONTENT_WORDS = 1200;

/**
 * Token-overlap ratio above which two titles are treated as the same post.
 *
 * Tuned against the case that actually recurs: a title extended by a couple of
 * words. "Choosing Between Rules And Models" against "…And Models In
 * Production" scores 0.71 on Jaccard, because the two added tokens count
 * against the union. A threshold of 0.8 would miss it.
 *
 * Set where a false positive is the cheaper error. Rejecting a legitimate post
 * costs one skipped cron cycle; letting a restatement through puts two
 * near-identical pages in the index, and the cron fails silently either way,
 * so the recoverable failure is the one to bias toward.
 */
export const DUPLICATE_TITLE_THRESHOLD = 0.7;

export const BlogDraftSchema = z.object({
  title: z.string().min(20).max(90),
  excerpt: z.string().min(80).max(200),
  content: z.string().min(1),
  type: z.enum(['blog', 'case-study']),
  topic: z.string().min(1).max(100),
  metrics: z
    .object({ percentage: z.number(), description: z.string() })
    .optional(),
  sources: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        url: z.string().url().startsWith('https://'),
      })
    )
    .optional(),
  caseStudyLink: z.string().url().startsWith('https://').nullable().optional(),
});

export type BlogDraft = z.infer<typeof BlogDraftSchema>;

export interface ScreenResult {
  pass: boolean;
  reasons: string[];
}

/**
 * Phrasing that must never reach an indexed page.
 *
 * The first entry is not hypothetical. The generator's own prompt instructed
 * it to emit that line whenever it could not find a credible source, so it is
 * sitting in real rows. A magnifying-glass emoji apologising for the absence
 * of research is the single clearest "this was machine-written and nobody
 * read it" signal a page can carry.
 */
export const BANNED_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  {
    label: 'the generator’s no-source fallback disclaimer',
    pattern: /No relevant case study available|🔎/i,
  },
  { label: 'an assistant self-reference', pattern: /\bas an? (?:AI|language model)\b/i },
  { label: 'placeholder text', pattern: /\blorem ipsum\b/i },
  { label: 'an unfinished marker', pattern: /\bTODO\b|\[insert\b|\{\{/i },
  // Markup vectors. The content is model-written and may summarise pages the
  // model was pointed at, so treating it as untrusted input is not paranoia.
  // Rendering goes through react-markdown, which escapes these anyway; this
  // is the belt to that braces, and it also keeps the raw column clean.
  { label: 'a script tag', pattern: /<script\b/i },
  { label: 'a javascript: URL', pattern: /javascript:/i },
  { label: 'an inline event handler', pattern: /\son[a-z]+\s*=\s*["']/i },
];

/**
 * First-person usage, which the generator's integrity rules forbid and nothing
 * enforced.
 *
 * It matters beyond style. The site speaks as Antonio everywhere else; a blog
 * post saying "we" means a machine-written piece is impersonating him, and a
 * model reading the site cannot tell the two voices apart.
 *
 * `us` is matched lowercase-only so "US-based clients" does not trip it, and
 * quoted spans are removed before this runs so a quotation from a cited case
 * study is not read as the author's own voice.
 */
const FIRST_PERSON_PATTERNS: ReadonlyArray<RegExp> = [
  /\bI\b/,
  /\bI['’](?:m|ve|ll|d)\b/i,
  /\b(?:we|we['’](?:re|ve|ll|d)|our|ours|my|mine|ourselves)\b/i,
  /\bus\b/,
];

/** Strips double-quoted spans so quoted material is not read as the author's voice. */
function withoutQuotations(text: string): string {
  return text.replace(/["“][^"”]{0,400}["”]/g, ' ');
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Lowercased word tokens, for comparing two titles. */
function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

/**
 * Jaccard overlap between two titles, 0 to 1.
 *
 * Word overlap rather than edit distance: the near-duplicates this generator
 * produces are reorderings and extensions of the same phrase, which edit
 * distance scores as far apart while overlap scores as near identical.
 */
export function titleSimilarity(a: string, b: string): number {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;

  return shared / (left.size + right.size - shared);
}

/**
 * Screens a generated draft. Returns every reason it failed, not just the
 * first, so one cron run surfaces the whole picture rather than one symptom
 * at a time.
 */
export function screenDraft(draft: unknown, recentTitles: readonly string[] = []): ScreenResult {
  const parsed = BlogDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      pass: false,
      reasons: parsed.error.issues.map(
        issue => `schema: ${issue.path.join('.') || '(root)'} ${issue.message.toLowerCase()}`
      ),
    };
  }

  const post = parsed.data;
  const reasons: string[] = [];
  const haystack = `${post.title}\n${post.excerpt}\n${post.content}`;

  for (const { label, pattern } of BANNED_PATTERNS) {
    if (pattern.test(haystack)) reasons.push(`contains ${label}`);
  }

  const prose = withoutQuotations(haystack);
  if (FIRST_PERSON_PATTERNS.some(pattern => pattern.test(prose))) {
    reasons.push('written in the first person');
  }

  const words = countWords(post.content);
  if (words < MIN_CONTENT_WORDS) {
    reasons.push(`too short: ${words} words, minimum ${MIN_CONTENT_WORDS}`);
  }
  if (words > MAX_CONTENT_WORDS) {
    reasons.push(`too long: ${words} words, maximum ${MAX_CONTENT_WORDS}`);
  }

  // A case study with nothing to cite is just a blog post making claims about
  // a company it will not name. The generator is supposed to downgrade in that
  // situation; this is what makes "supposed to" enforceable.
  if (post.type === 'case-study' && !post.caseStudyLink) {
    reasons.push('a case study with no source link');
  }

  const duplicate = recentTitles.find(
    title => titleSimilarity(title, post.title) >= DUPLICATE_TITLE_THRESHOLD
  );
  if (duplicate) {
    reasons.push(`near-duplicate of an existing post: "${duplicate}"`);
  }

  return { pass: reasons.length === 0, reasons };
}
