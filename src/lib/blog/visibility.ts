/**
 * Whether the blog is advertised to search engines yet.
 *
 * The pages are live and linkable from the moment they ship. This controls
 * something narrower: whether crawlers are invited in, via the robots
 * directive on the blog routes and the presence of blog URLs in the sitemap.
 * Both read this constant, so the two can never disagree — a sitemap listing
 * URLs that carry noindex is a contradiction search engines notice.
 *
 * It starts false on purpose.
 *
 * The publish gate (src/lib/blog/pipeline.ts) is new and unproven, and the
 * existing back catalogue was written with no validation whatsoever by a model
 * two generations old. Scaled-content signals are assessed across a whole
 * site rather than per URL, so pointing crawlers at that archive before it has
 * been swept would put / and /work/* at risk, and those are the pages that
 * carry the actual value.
 *
 * ── To turn it on ────────────────────────────────────────────────────────────
 *   1. node scripts/quarantine-blog.ts            (read every verdict)
 *   2. node scripts/quarantine-blog.ts --apply
 *   3. Read the surviving posts. The screen is deterministic: it proves a post
 *      is not obviously broken, not that it is worth someone's time.
 *   4. Flip this to true.
 *   5. Resubmit the sitemap in Search Console.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BLOG_INDEXABLE = false;

/**
 * The robots directive for the blog routes.
 *
 * `follow` stays true even while indexing is off: the links out of these pages
 * point at / and /work/*, and there is no reason to refuse that signal.
 */
export const BLOG_ROBOTS = BLOG_INDEXABLE
  ? { index: true, follow: true }
  : { index: false, follow: true };
