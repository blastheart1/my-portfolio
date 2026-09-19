/**
 * faq-section.test.tsx
 *
 * Guard rail:
 *   N21 — every FAQ in the markup must be visible on the page
 *
 * FAQPage JSON-LD is built from the same FAQS array this component renders.
 * Google requires marked-up FAQ content to be visible to the visitor, so an
 * entry added to the array but not rendered is a structured-data violation
 * rather than a harmless extra.
 *
 * Sharing one array is what makes that structurally hard, but "hard" is not
 * "impossible": a future accordion, a slice, or a filter on the render side
 * would break the correspondence while both halves still looked reasonable.
 * This asserts the counts match.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import FAQSection from '../FAQSection';
import { FAQS } from '@/lib/faqs';
import { homePageNodes } from '@/lib/structured-data';

type Node = { '@type'?: string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] };

describe('N21 — the markup and the page agree', () => {
  it('renders every question in the array', () => {
    render(<FAQSection />);

    for (const faq of FAQS) {
      expect(screen.getByText(faq.question), faq.question).toBeInTheDocument();
    }
  });

  it('renders every answer in full, not behind a disclosure', () => {
    // Assistants extracting text from the rendered page are more reliable when
    // it is simply there, and these answers are the highest-intent copy on the
    // site. Hiding them behind a click works against the reason they exist.
    render(<FAQSection />);

    for (const faq of FAQS) {
      expect(screen.getByText(faq.answer), faq.question).toBeVisible();
    }
  });

  it('renders exactly as many questions as the schema claims', () => {
    render(<FAQSection />);

    const faqNode = (homePageNodes() as Node[]).find(node => node['@type'] === 'FAQPage');
    const marked = faqNode?.mainEntity ?? [];

    const rendered = screen.getAllByRole('term');

    expect(rendered).toHaveLength(marked.length);
    expect(marked).toHaveLength(FAQS.length);
  });

  it('marks up the same text it renders, character for character', () => {
    render(<FAQSection />);

    const faqNode = (homePageNodes() as Node[]).find(node => node['@type'] === 'FAQPage');

    for (const entry of faqNode?.mainEntity ?? []) {
      expect(screen.getByText(entry.name)).toBeInTheDocument();
      expect(screen.getByText(entry.acceptedAnswer.text)).toBeInTheDocument();
    }
  });
});

describe('the answers stay written for citation', () => {
  it('every answer is long enough to stand alone as a quote', () => {
    // A one-line answer gets paraphrased; a paragraph gets lifted.
    for (const faq of FAQS) {
      expect(faq.answer.length, faq.question).toBeGreaterThan(200);
    }
  });

  it('no answer needs its question to make sense', () => {
    // A leading "Yes," or "It depends" only parses next to the question, and
    // an assistant quoting it in isolation produces something meaningless.
    for (const faq of FAQS) {
      expect(faq.answer, faq.question).not.toMatch(/^(yes|no|it depends|sure)[,.]/i);
    }
  });

  it('uses no em dashes, per the house style', () => {
    for (const faq of FAQS) {
      expect(faq.answer, faq.question).not.toContain('—');
      expect(faq.question).not.toContain('—');
    }
  });

  it('asks each question only once', () => {
    expect(new Set(FAQS.map(faq => faq.question)).size).toBe(FAQS.length);
  });
});
