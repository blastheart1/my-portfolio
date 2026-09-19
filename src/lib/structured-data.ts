import { SITE_URL } from '@/lib/site';
import type { ServiceTier } from '@/lib/content-queries';
import { FAQS } from '@/lib/faqs';
import { WORK_PROJECTS } from '@/lib/work-projects';
import type { BlogPost } from '@/types/blog';

/**
 * Schema.org node builders.
 *
 * Pure functions returning plain objects, so a graph can be asserted in a unit
 * test without rendering a page. The component that emits them
 * (src/components/StructuredData.tsx) is a thin <script> wrapper and must stay
 * a server component: a client component would inject the JSON-LD on
 * hydration, where it is visible in devtools and invisible to every crawler
 * and to curl. Guard rail N15.
 *
 * These used to be one array rendered from the root layout, which meant every
 * route served a ProfilePage whose @id and url were the home page, plus the
 * full FAQPage. Duplicated FAQ markup across URLs gets discounted, and the
 * mismatched ProfilePage weakened the entity signal on exactly the pages most
 * worth citing. They are split by scope now:
 *
 *   every route   Person, ProfessionalService, WebSite - a stable identity
 *                 graph, correct wherever it appears
 *   /             ProfilePage, FAQPage
 *   /work/[slug]  that project's CreativeWork
 *   /blog         Blog
 *   /blog/[slug]  BlogPosting
 *
 * The @id values are the spine. Every node referring to Antonio points at
 * PERSON_ID rather than restating his details, so an assistant resolves one
 * entity instead of guessing whether three similar descriptions are one man.
 */

export const PERSON_ID = `${SITE_URL}/#person`;
export const PRACTICE_ID = `${SITE_URL}/#practice`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const WEBPAGE_ID = `${SITE_URL}/#webpage`;
export const BLOG_ID = `${SITE_URL}/blog#blog`;

const PERSON = PERSON_ID;
const PRACTICE = PRACTICE_ID;

/**
 * The offer catalog, from the database.
 *
 * Omitted entirely when there are no visible tiers, rather than emitted
 * empty. An OfferCatalog with nothing in it claims the practice sells
 * nothing, which is a different statement from not saying.
 *
 * Prices are only asserted where the row has one. Schema that names a price
 * a visitor cannot find anywhere is the same problem as marked-up FAQ text
 * that is not on the page.
 */
function offerCatalog(tiers: readonly ServiceTier[]) {
  if (tiers.length === 0) return {};

  return {
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Engineering services',
      itemListElement: tiers.map(tier => ({
        '@type': 'Offer',
        name: tier.name,
        ...(tier.price_usd ? { price: String(tier.price_usd), priceCurrency: 'USD' } : {}),
        description: [tier.outcome, tier.features.join(', ')].filter(Boolean).join(' '),
      })),
    },
  };
}

/** An ISO date, or undefined when the value is unusable. */
function isoDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Identity nodes, served on every route.
 *
 * Safe everywhere precisely because none of them claims to BE the current
 * page. They describe the person, the practice and the site as entities; the
 * page-level node is what says "and this URL is about them".
 */
export function siteIdentityNodes(tiers: readonly ServiceTier[] = []) {
  return [
  {
    '@type': 'Person',
    '@id': PERSON,
    name: 'Antonio Luis Santos',
    alternateName: 'Luis Santos',
    // Three titles, all true, ordered by what he wants to be hired for
    // rather than by seniority. schema.org allows jobTitle to repeat, and a
    // person genuinely holding several roles is exactly the case it is for.
    // This is an entity signal, not a keyword list: every one of these
    // appears in hasOccupation below with the skills that back it.
    jobTitle: [
      'AI Automation and Integration Engineer',
      'AI Full-Stack Software Engineer',
      'Senior IBM ODM Specialist',
    ],
    description:
      'AI automation and integration engineer. He removes the manual work that exists only because a company\u2019s systems do not talk to each other: re-keying data between platforms, chasing approvals, rebuilding the same report every week. That is usually an API integration, sometimes a scheduled automation, and sometimes a language model that reads unstructured input and routes it. A decade of enterprise decision automation at Bell Canada (IBM ODM / BRMS) and QA leadership sits behind the AI work, which is what lets him judge which decisions must stay deterministic and auditable and which genuinely need a model.',
    url: SITE_URL,
    image: `${SITE_URL}/profile-photo2.png`,
    email: 'mailto:antonioluis.santos1@gmail.com',
    nationality: { '@type': 'Country', name: 'Philippines' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Quezon City',
      addressRegion: 'Metro Manila',
      addressCountry: 'PH',
    },
    sameAs: [
      'https://www.linkedin.com/in/alasantos01/',
      'https://github.com/blastheart1',
      'https://www.instagram.com/0xlv1s_/',
    ],
    // Ordered by what differentiates him, not by how much he uses each.
    knowsAbout: [
      'Agentic AI Systems',
      'Large Language Model Integration',
      'OpenAI API',
      'Anthropic Claude API',
      'Google Gemini API',
      'DeepSeek',
      'Kimi',
      'Self-Hosted Open-Weight Models',
      'Retrieval-Augmented Generation',
      'Legacy System Integration',
      'IBM Operational Decision Manager',
      'Business Rule Management Systems',
      'Decision Automation',
      'Full-Stack Development',
      'Next.js',
      'React',
      'TypeScript',
      'Python',
      'FastAPI',
      'TensorFlow.js',
      'Quality Assurance Leadership',
      'Test Strategy',
      'Workflow Automation',
      'API Integration',
      // Added for how the work is actually searched for, not for volume.
      // Each is something there is evidence of on the site.
      'AI Automation',
      'System Integration',
      'Business Process Automation',
      'Human-in-the-Loop Workflow Design',
      'Model Selection and Cost Optimisation',
    ],
    hasOccupation: [
      {
        '@type': 'Occupation',
        name: 'AI Automation and Integration Engineer',
        occupationLocation: { '@type': 'Country', name: 'Philippines' },
        skills:
          'API and platform integration, workflow automation, LLM integration with guardrails, legacy system integration, human-in-the-loop process design',
      },
      {
        '@type': 'Occupation',
        name: 'AI Full-Stack Software Engineer',
        occupationLocation: { '@type': 'Country', name: 'Philippines' },
        skills:
          'Agentic AI systems, LLM application development, React, Next.js, TypeScript, Python, FastAPI',
      },
      {
        '@type': 'Occupation',
        name: 'Senior IBM ODM Specialist',
        skills:
          'IBM Operational Decision Manager, BRMS, rule authoring, decision services, enterprise decision automation',
      },
      {
        '@type': 'Occupation',
        name: 'QA Team Manager',
        skills: 'Test strategy, release quality, QA leadership, defect management',
      },
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'Bell Canada Inc.',
      url: 'https://www.bell.ca',
    },
    seeks: {
      '@type': 'Demand',
      name: 'Freelance and contract engineering work',
      description:
        'Available for remote freelance and contract work: agentic AI systems, LLM integration, full-stack builds, platform integration and workflow automation.',
    },
    mainEntityOfPage: { '@id': `${SITE_URL}/#webpage` },
  },
  {
    '@type': 'ProfessionalService',
    '@id': PRACTICE,
    name: 'Code by Luis',
    url: SITE_URL,
    description:
      'Freelance AI automation and integration engineering: connecting disconnected business systems, automating the manual steps between them, and building LLM-backed features with guardrails. Enterprise decision automation (IBM ODM / BRMS) where a decision has to stay auditable.',
    founder: { '@id': PERSON },
    provider: { '@id': PERSON },
    image: `${SITE_URL}/profile-photo2.png`,
    priceRange: '$599–$2,999+',
    currenciesAccepted: 'USD, PHP',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Quezon City',
      addressRegion: 'Metro Manila',
      addressCountry: 'PH',
    },
    // Remote-first: the service area is not the office location.
    areaServed: [
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'Canada' },
      { '@type': 'Country', name: 'Australia' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'Philippines' },
      { '@type': 'Place', name: 'Worldwide (remote)' },
    ],
    availableLanguage: [
      { '@type': 'Language', name: 'English' },
      { '@type': 'Language', name: 'Filipino' },
    ],
    // Built from the same rows the site and llms.txt read, never restated.
    // These three offers used to be hardcoded here AND seeded in
    // service_tiers AND duplicated in ServicesSection's fallback, three
    // copies free to disagree the moment anyone edited a price in /edit.
    // They agreed only by luck. One source removes the class of bug.
    ...offerCatalog(tiers),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      url: 'https://calendly.com/antonioluis-santos1/30min',
      email: 'antonioluis.santos1@gmail.com',
      availableLanguage: ['English', 'Filipino'],
    },
  },
  {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Code by Luis',
    url: SITE_URL,
    description:
      'Portfolio of Antonio Luis Santos — AI Full-Stack Software Engineer building agentic systems, LLM applications and enterprise decision automation.',
    inLanguage: 'en',
    author: { '@id': PERSON },
    publisher: { '@id': PERSON },
  },
  ];
}

/**
 * The home page's own nodes.
 *
 * ProfilePage is the correct type for a personal portfolio and is what several
 * AI search products look for when deciding whether a page is about a person
 * rather than merely mentioning one. It belongs on / alone.
 *
 * FAQPage mirrors the visible FAQSection from the same FAQS array. Google
 * requires marked-up FAQ content to be visible to the visitor, and one source
 * is what guarantees the markup cannot describe something absent from the page.
 *
 * `modified` is passed in rather than read from the clock. A module-scope
 * `new Date()` told every consumer that every page changed on every build,
 * and a freshness claim that is wrong that often stops being read at all.
 */
export function homePageNodes(modified: Date = new Date()) {
  const LAST_MODIFIED = isoDate(modified)!;

  return [
  {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    isPartOf: { '@id': `${SITE_URL}/#webpage` },
    about: { '@id': PERSON },
    mainEntity: FAQS.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  },
  {
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}/#webpage`,
    url: SITE_URL,
    dateModified: LAST_MODIFIED,
    name: 'Antonio Luis Santos — AI Full-Stack Software Engineer',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': PERSON },
    mainEntity: { '@id': PERSON },
    inLanguage: 'en',
  },
  ];
}

/**
 * One case study.
 *
 * These were on the home page graph, which described work living at
 * /work/[slug] from a page that is not it. They now render on the page they
 * are about.
 */
export function workProjectNodes(slug: string) {
  // Derived from WORK_PROJECTS so a case study cannot exist in the graph
  // without existing as a page, or vice versa.
  const known = new Set(WORK_PROJECTS.map(project => project.slug));
  if (!known.has(slug)) return [];

  return WORK_NODES.filter(node => node['@id'] === `${SITE_URL}/work/${slug}#work`);
}

const WORK_NODES = [
  {
    '@type': 'CreativeWork',
    '@id': `${SITE_URL}/work/relay#work`,
    name: 'Relay',
    url: `${SITE_URL}/work/relay`,
    creator: { '@id': PERSON },
    abstract:
      'Turns a spoken voice note into a drafted email, with a second model from a different vendor auditing the draft against the transcript and flagging unsupported claims.',
    keywords: 'voice to email, LLM auditing, cross-model verification, Whisper, OpenAI, Anthropic Claude',
  },
  {
    '@type': 'CreativeWork',
    '@id': `${SITE_URL}/work/automation#work`,
    name: 'Automation Lab',
    url: `${SITE_URL}/work/automation`,
    creator: { '@id': PERSON },
    abstract:
      'Three sanitized production workflows with every step marked as a deterministic rule, a model call, an integration, or a human decision.',
    keywords: 'workflow automation, lead routing, decision automation, human in the loop',
  }
];

/**
 * One post.
 *
 * `dateModified` comes from the row rather than from `new Date()`. The home
 * page graph used to stamp the current time at module scope, which told every
 * consumer that every page changed on every build — a freshness claim that is
 * false often enough to be discounted entirely.
 */
export function blogPostingNode(post: BlogPost) {
  if (!post.slug) return null;

  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: post.excerpt,
    inLanguage: 'en',
    datePublished: isoDate(post.createdAt),
    dateModified: isoDate(post.updatedAt) ?? isoDate(post.createdAt),
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': BLOG_ID },
    ...(post.topic ? { about: post.topic } : {}),
    // Only real citations. An empty array would claim the post cites nothing,
    // which is a different statement from not saying.
    ...(post.caseStudyLink || post.sources?.length
      ? {
          citation: [
            ...(post.caseStudyLink ? [post.caseStudyLink] : []),
            ...(post.sources ?? []).map(source => source.url),
          ],
        }
      : {}),
  };
}

/** The index, as a collection that owns the posts rather than a loose page. */
export function blogCollectionNode(posts: readonly BlogPost[]) {
  return {
    '@type': 'Blog',
    '@id': BLOG_ID,
    url: `${SITE_URL}/blog`,
    name: 'Writing — Antonio Luis Santos',
    description:
      'Posts on LLM integration, decision automation, workflow automation and test strategy.',
    inLanguage: 'en',
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    blogPost: posts
      .filter(post => post.slug)
      .map(post => ({
        '@type': 'BlogPosting',
        '@id': `${SITE_URL}/blog/${post.slug}#post`,
        url: `${SITE_URL}/blog/${post.slug}`,
        headline: post.title,
        datePublished: isoDate(post.createdAt),
      })),
  };
}

/** Wraps nodes in the envelope every graph on this site shares. */
export function graph(nodes: readonly unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
