import { SITE_URL } from '@/lib/site';
import { FAQS } from '@/lib/faqs';

/**
 * JSON-LD for search engines and, increasingly, for the models behind AI
 * answers — a linked graph is the cleanest way to state facts about a person
 * that an assistant can lift without paraphrasing errors.
 *
 * FAQPage is included and legitimate: the same FAQS array renders visibly in
 * FAQSection on the home page. Google requires marked-up FAQ content to be
 * visible to the visitor, and sharing one source is what guarantees the markup
 * can never describe something that is not on the page.
 *
 * Server component — no "use client"; renders as a plain <script> tag.
 */

const PERSON = `${SITE_URL}/#person`;
const PRACTICE = `${SITE_URL}/#practice`;

export default function StructuredData() {
  const graph = [
    {
      '@type': 'Person',
      '@id': PERSON,
      name: 'Antonio Luis Santos',
      alternateName: 'Luis Santos',
      // Leads with what he wants to be found for rather than the current job
      // title — the title is captured under hasOccupation below.
      jobTitle: 'AI Full-Stack Software Engineer',
      description:
        'AI Full-Stack Software Engineer who automates the manual work between disconnected business systems so teams can focus on work that needs judgment. Builds agentic systems and LLM-backed applications across OpenAI, Claude, Gemini, DeepSeek and self-hosted open-weight models, with a decade of enterprise decision automation (IBM ODM/BRMS) and QA leadership behind it.',
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
      ],
      hasOccupation: [
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

    // The freelance practice, distinct from the employer above. This is the
    // node that carries availability, pricing and reach — the facts an
    // assistant needs to answer "can I hire this person, and roughly what for".
    {
      '@type': 'ProfessionalService',
      '@id': PRACTICE,
      name: 'Code by Luis',
      url: SITE_URL,
      description:
        'Freelance software engineering: agentic AI systems, LLM integration, full-stack web applications, API and platform integration, and workflow automation.',
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
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Engineering services',
        itemListElement: [
          {
            '@type': 'Offer',
            name: 'Starter',
            price: '599',
            priceCurrency: 'USD',
            description:
              'Up to 5 pages, responsive and mobile-first, contact form, SEO basics and analytics, 7-day post-launch support.',
          },
          {
            '@type': 'Offer',
            name: 'Professional',
            price: '1199',
            priceCurrency: 'USD',
            description:
              'Up to 15 pages, e-commerce and payment gateway integration, advanced SEO and schema, analytics dashboard, 14-day priority support.',
          },
          {
            '@type': 'Offer',
            name: 'Enterprise',
            price: '2999',
            priceCurrency: 'USD',
            description:
              'Custom systems built to scale, AI chatbot and platform integration, 30-day support.',
          },
        ],
      },
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

    // Mirrors the visible FAQSection, from the same FAQS array.
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

    // ProfilePage is the correct type for a personal portfolio and is what
    // several AI search products look for when deciding whether a page is
    // about a person rather than merely mentioning one.
    {
      '@type': 'ProfilePage',
      '@id': `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: 'Antonio Luis Santos — AI Full-Stack Software Engineer',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': PERSON },
      mainEntity: { '@id': PERSON },
      inLanguage: 'en',
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}
