/**
 * Whether the blog is advertised to search engines yet.
 *
 * The pages are live and linkable from the moment they ship. This controls
 * something narrower: whether crawlers are invited in, via the robots
 * directive on the blog routes and the presence of blog URLs in the sitemap.
 * Both read this constant, so the two can never disagree — a sitemap listing
 * URLs that carry noindex is a contradiction search engines notice.
 *
 * Now true. It started false because the blog was a Supabase table holding
 * roughly fifteen unreviewed machine-written posts, and pointing crawlers at
 * that archive before it had been swept would have put / and /work/* at risk —
 * scaled-content signals are assessed across a whole site, not per URL.
 *
 * The Neon migration settled it without the sweep ever running: none of those
 * rows came across. Every post in the table now is hand-written and has passed
 * the publish gate in scripts/publish-post.ts — the deterministic screen, live
 * verification of every citation, and a cross-vendor audit. That is a higher
 * bar than the quarantine script was ever going to apply.
 *
 * Turning it back off is one line, and the reason to would be the same as the
 * reason it was off: a body of published content nobody has read.
 */
export const BLOG_INDEXABLE = true;

/**
 * The robots directive for the blog routes.
 *
 * `follow` stays true even while indexing is off: the links out of these pages
 * point at / and /work/*, and there is no reason to refuse that signal.
 */
export const BLOG_ROBOTS = BLOG_INDEXABLE
  ? { index: true, follow: true }
  : { index: false, follow: true };
