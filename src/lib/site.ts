/**
 * Canonical site identity.
 *
 * Single source of truth for the production origin. Previously this was
 * hardcoded as "https://luis.dev" in 12 places across layout metadata,
 * sitemap, robots, the OG image and the schema.org JSON-LD — a domain that is
 * not this site. A wrong canonical tells search engines the content belongs
 * elsewhere, which suppresses ranking for the real domain.
 *
 * Keep every absolute URL derived from SITE_URL so this can never drift again.
 */
export const SITE_URL = 'https://codebyluis.dev';

/**
 * The role phrase the site leads with.
 *
 * Lives here because it has to appear identically in the page title, the
 * web manifest and the JSON-LD, and those are three files that drifted apart
 * once already — the manifest was still calling this site "Luis.dev" and its
 * owner a "Full-Stack Developer & QA Specialist" long after everything else
 * had moved on. A guard rail checks the manifest against this constant.
 *
 * It is a positioning decision, not a keyword: "AI Full-Stack Software
 * Engineer" is the most contested term in the space and says nothing about
 * what is for sale. This one is closer to the work and to how the problem
 * gets described out loud.
 */
export const ROLE_TITLE = 'AI Automation & Integration Engineer';

/** Bare hostname, for display in the OG image and similar. */
export const SITE_DOMAIN = 'codebyluis.dev';

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}
