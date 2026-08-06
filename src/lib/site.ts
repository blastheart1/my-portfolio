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

/** Bare hostname, for display in the OG image and similar. */
export const SITE_DOMAIN = 'codebyluis.dev';

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}
