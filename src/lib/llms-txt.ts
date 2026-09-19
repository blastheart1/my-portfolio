import { getProjects, getServiceTiers, type ProjectRow, type ServiceTier } from '@/lib/content-queries';
import { getBlogPosts } from '@/lib/database';
import { BLOG_INDEXABLE } from '@/lib/blog/visibility';
import { FAQS } from '@/lib/faqs';
import { SITE_URL } from '@/lib/site';
import { WORK_PROJECTS } from '@/lib/work-projects';
import type { BlogPost } from '@/types/blog';

import {
  LLMS_INTRO,
  LLMS_NOTES,
  LLMS_PROBLEM,
  LLMS_TECHNOLOGY,
  LLMS_UNUSUAL,
  LLMS_WHO,
} from '@/lib/llms-content';

/**
 * Builds /llms.txt and /llms-full.txt.
 *
 * The file was 153 hand-maintained lines restating facts that live in the
 * database and in faqs.ts and work-projects.ts. It could already contradict
 * the hasOfferCatalog prices in the JSON-LD, and a model reading two different
 * prices for the same tier is precisely the failure this file exists to
 * prevent. Prices, services, projects, the FAQ and the case studies now come
 * from the same sources the rendered pages use.
 *
 * ── Every data read here must be allowed to fail ─────────────────────────────
 * scripts/check-indexability.sh asserts /llms.txt returns 200, and it is a
 * static asset in every sense that matters to a crawler. A composer that can
 * throw turns a missing database into a 500 on a file that should always be
 * there. So each section is fetched independently and a failure drops that
 * section rather than the response.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Runs a read, returning the fallback rather than propagating a failure. */
async function safely<T>(read: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[llms.txt] ${label} unavailable:`, error);
    return fallback;
  }
}

function formatPrice(tier: ServiceTier): string {
  if (tier.price_usd) return `$${tier.price_usd.toLocaleString('en-US')}`;
  if (tier.price_php) return `₱${tier.price_php.toLocaleString('en-US')}`;
  return 'on request';
}

function servicesSection(tiers: readonly ServiceTier[]): string {
  if (tiers.length === 0) return '';

  const lines = tiers.map(tier => {
    const detail = [tier.outcome, tier.features.join(', ')].filter(Boolean).join(' ');
    return `- **${tier.name} — ${formatPrice(tier)}** — ${detail}`;
  });

  return [
    '## Services',
    '',
    'Freelance and contract engagements. Prices are starting points, not quotes.',
    '',
    ...lines,
    '',
    'Also available: AI chatbot integration, API and platform integration work,',
    'workflow automation, and QA/test-strategy consulting.',
  ].join('\n');
}

function demosSection(): string {
  return [
    '## Live demos on this site',
    '',
    `These run in the browser at ${SITE_URL}, no signup:`,
    '',
    ...WORK_PROJECTS.map(
      project => `- **${project.title}** — ${SITE_URL}/work/${project.slug} — ${project.summary}`
    ),
  ].join('\n');
}

function projectsSection(projects: readonly ProjectRow[]): string {
  const listed = projects.filter(project => project.link);
  if (listed.length === 0) return '';

  return [
    '## Selected work',
    '',
    ...listed.map(project =>
      [`- **${project.title}** — ${project.description ?? ''}`.trim(), `  ${project.link}`].join('\n')
    ),
  ].join('\n');
}

function faqSection(): string {
  return [
    '## Common questions',
    '',
    ...FAQS.flatMap(faq => [`**${faq.question}**`, faq.answer, '']),
  ]
    .join('\n')
    .trimEnd();
}

/**
 * Recent posts.
 *
 * Omitted entirely while BLOG_INDEXABLE is false. Listing URLs here that carry
 * a noindex directive would be the same contradiction the sitemap avoids, and
 * llms.txt is read by the crawlers most likely to just fetch what it names.
 */
function writingSection(posts: readonly BlogPost[], full: boolean): string {
  const linkable = posts.filter(post => post.slug);
  if (!BLOG_INDEXABLE || linkable.length === 0) return '';

  return [
    '## Recent writing',
    '',
    ...linkable.flatMap(post => {
      const head = `- **${post.title}** — ${SITE_URL}/blog/${post.slug}`;
      return full ? [head, `  ${post.excerpt}`, ''] : [`${head} — ${post.excerpt}`];
    }),
  ]
    .join('\n')
    .trimEnd();
}

/** Case-study prose, inlined for the full variant. */
function caseStudiesSection(): string {
  return [
    '## Case studies in full',
    '',
    ...WORK_PROJECTS.flatMap(project => [
      `### ${project.title}`,
      `${SITE_URL}/work/${project.slug}`,
      '',
      project.summary,
      '',
      `Built with: ${project.tech.join(', ')}.`,
      '',
    ]),
  ]
    .join('\n')
    .trimEnd();
}

export interface BuildOptions {
  /**
   * The full variant inlines case-study prose and post excerpts. It is what an
   * assistant ingesting the site whole should read; the short one is a map.
   */
  full?: boolean;
}

export async function buildLlmsTxt({ full = false }: BuildOptions = {}): Promise<string> {
  const [tiers, projects, posts] = await Promise.all([
    safely(() => getServiceTiers(), [] as ServiceTier[], 'service tiers'),
    safely(() => getProjects(), [] as ProjectRow[], 'projects'),
    // Skipped entirely when the blog is not advertised, so an unreachable
    // the database cannot even slow this response down.
    BLOG_INDEXABLE
      ? safely(() => getBlogPosts(10), [] as BlogPost[], 'blog posts')
      : Promise.resolve([] as BlogPost[]),
  ]);

  const sections = [
    LLMS_INTRO,
    LLMS_WHO,
    LLMS_PROBLEM,
    LLMS_UNUSUAL,
    servicesSection(tiers),
    demosSection(),
    ...(full ? [caseStudiesSection()] : []),
    projectsSection(projects),
    writingSection(posts, full),
    LLMS_TECHNOLOGY,
    faqSection(),
    LLMS_NOTES,
  ];

  return `${sections.filter(Boolean).join('\n\n')}\n`;
}

/** The response every llms route returns, with the headers crawlers need. */
export function llmsResponse(body: string): Response {
  return new Response(body, {
    headers: {
      // Explicit and non-negotiable: next.config.ts sends
      // X-Content-Type-Options: nosniff on every route, so a wrong or missing
      // content type makes the file unreadable with no visible error.
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
