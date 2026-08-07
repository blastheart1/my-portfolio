import { FAQS } from '@/lib/faqs';

/**
 * FAQ.
 *
 * Answers render in full rather than behind an accordion. Google will honour
 * FAQPage markup on collapsed content, but AI assistants extracting text from
 * the rendered page are more reliable when it is simply there — and these
 * answers are the highest-intent copy on the site, so hiding them behind a
 * click works against the reason they exist.
 *
 * Content comes from lib/faqs.ts, which also feeds the FAQPage JSON-LD in
 * StructuredData. One source, so the markup can never claim something the
 * visitor cannot see.
 */
export default function FAQSection({
  heading,
  subheading,
}: {
  heading?: string;
  subheading?: string;
}) {
  return (
    <section id="faq" className="max-w-6xl mx-auto px-6 py-24">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-light uppercase text-gray-900 dark:text-gray-100 tracking-[-0.02em] leading-[0.95]">
          {heading || 'Questions.'}
          <span className="text-gray-400 dark:text-gray-500 block mt-2 font-display font-light normal-case text-xl md:text-2xl tracking-[0.01em] leading-snug">
            {subheading || 'What people ask before we start.'}
          </span>
        </h2>
      </div>

      {/* dl/dt/dd is the correct structure for a question-and-answer list and
          gives assistive tech the pairing for free. */}
      <dl className="space-y-10">
        {FAQS.map(faq => (
          <div key={faq.question}>
            <dt className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
              {faq.question}
            </dt>
            <dd className="mt-2 leading-relaxed text-gray-600 dark:text-gray-300">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
