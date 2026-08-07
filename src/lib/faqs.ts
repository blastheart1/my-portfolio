/**
 * FAQ content.
 *
 * Single source of truth for BOTH the visible section and the FAQPage JSON-LD.
 * Google requires marked-up FAQ content to be visible to the visitor; deriving
 * the schema from the same array is what guarantees they can never drift apart,
 * which is the usual way sites end up with a structured-data penalty.
 *
 * Answers are written to be quoted verbatim by an AI assistant, so each one
 * stands alone without needing the question for context. Written in plain
 * sentences with no em dashes: an answer that reads like marketing copy gets
 * skipped by a human and adds nothing for a model either.
 */

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: 'What problem do you actually solve?',
    answer:
      'Most companies lose hours every week to work that only exists because their software does not connect. Someone re-keys an order from one system into another, someone chases an approval over email, someone rebuilds the same report every Monday morning. I remove that work. Usually it is an API integration, sometimes a scheduled automation, sometimes an AI layer that reads messy input like an invoice or an inbound enquiry and routes it to the right place. The work is worth doing when it hands your team back time they can spend on something only a person can do.',
  },
  {
    question: 'How do you decide what to automate?',
    answer:
      'I look for where the volume is and where the mistakes are, which is rarely where the interesting technology is. Some decisions belong in deterministic rules you can audit and explain to an auditor, and I spent years building exactly that at enterprise scale with IBM ODM and BRMS. Others need a language model, because the input is unstructured and the rulebook would never finish being written. Getting that split wrong is why a lot of "add AI to it" projects get quietly switched off six months later. I came up through QA leadership, so I design for the failure case first: a process that is fast and occasionally wrong costs more than the slow manual one it replaced.',
  },
  {
    question: 'Which AI models do you build with?',
    answer:
      "OpenAI, Anthropic's Claude, Google Gemini, DeepSeek, Kimi, and open-weight models running on hardware you control. I choose per use case rather than per vendor, weighing cost per token, latency, context window, and how much of your data is allowed to leave your infrastructure. Some workloads should never touch a hosted API at all, and that call comes before the model choice. Building this way also keeps you out of lock-in, which matters because pricing and capability rankings shift every few months. Swapping the model underneath should be a configuration change, not a rebuild.",
  },
  {
    question: 'Will you replace the systems we already have?',
    answer:
      'Only if replacing them is a clear win, and most of the time it is not. My default is to keep what works and connect it, because your team already knows the tool, your history already lives inside it, and a migration is a risk you are choosing to take on. So I start by working out what the current system genuinely costs you: the licence, but also the manual steps built around it, the errors it lets through, and whether the vendor will still be around in three years. If that total is lower than the cost of moving, we integrate and you keep the stability. If the platform is a dead end that holds your data hostage or blocks something you need next year, I will tell you, and we plan a move you can survive. That means phased, reversible, with both systems running until the new one has earned the traffic.',
  },
  {
    question: 'How do we start, and how do you work with clients abroad?',
    answer:
      'A 30-minute call where you walk me through the process that annoys you most. From there the work runs either as a scoped build with fixed milestones or as an ongoing retainer if you want someone maintaining it. Support after launch is included on every package: 7 days on Starter, 14 on Professional, 30 on Enterprise. I work remotely from Quezon City, Philippines (UTC+8). Most of my clients are US-based, so overlapping their working day is routine rather than an exception, and I quote in USD for clients outside the Philippines.',
  },
];
