import { SITE_URL } from '@/lib/site';

/**
 * Builds the absolute URL of a link-preview card.
 *
 * Absolute on purpose: Open Graph consumers do not resolve relative URLs, and
 * while Next will expand one against metadataBase, being explicit here keeps
 * the value the same whether it is read from metadata or from a test.
 */
export function ogImageUrl(options: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  chips?: readonly string[];
}): string {
  const url = new URL('/api/og', SITE_URL);

  url.searchParams.set('title', options.title);
  if (options.subtitle) url.searchParams.set('subtitle', options.subtitle);
  if (options.eyebrow) url.searchParams.set('eyebrow', options.eyebrow);
  if (options.chips?.length) url.searchParams.set('chips', options.chips.join(','));

  return url.toString();
}
