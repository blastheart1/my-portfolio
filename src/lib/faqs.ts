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
 *
 * This is the highest-leverage content on the site for being cited. An
 * assistant asked "who can build me an agentic AI system" has to answer from
 * something, and a direct answer to a question a buyer actually asks is far
 * more liftable than a paragraph of positioning. Expanded from six entries to
 * cover what people ask before committing: cost and structure, timezone,
 * what the first month looks like, how a model gets chosen, what gets turned
 * down, what happens after launch, and how to judge whether a process is worth
 * automating at all.
 *
 * Every entry here MUST render visibly in FAQSection. Google requires
 * marked-up FAQ content to be visible to the visitor, and structured data
 * describing text that is not on the page is a violation rather than a
 * shortcut. Both read this array, and a test asserts the counts match.
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
  {
    question: 'What does an engagement cost, and how is it structured?',
    answer:
      'Packages start at $599 for a small site, $1,199 for something with e-commerce or a real back end, and $2,999 for custom systems built to scale. Those are starting points rather than quotes, because the number that matters depends on what the thing has to do. Work runs either as a scoped build with fixed milestones, where you know the total before it starts, or as a monthly retainer if you want someone maintaining and extending it. For integration and automation work a retainer usually fits better, since the useful version of that job is never finished in one pass. I quote in USD for clients outside the Philippines.',
  },
  {
    question: 'How do you work with clients in other timezones?',
    answer:
      'I am in Quezon City, Philippines, which is UTC+8. Most of my clients are in the United States, so overlapping their working day is the normal arrangement rather than a favour: I take calls in their morning, which is my evening. Australia and Singapore overlap almost completely. The UK and Europe are the awkward ones and work on a few fixed hours of overlap plus written handover. What matters more than the clock is that you get something you can look at most days, so progress is visible without a meeting to explain it.',
  },
  {
    question: 'What does the first month actually look like?',
    answer:
      'A call where you walk me through the process that annoys you most, then I go and watch the real thing happen. The first deliverable is usually not code. It is a written description of the current process with the volumes and the failure points marked, because most people have never seen their own process written down and the argument about what to automate resolves itself once they have. Then the smallest piece that returns real hours goes first, in production, with the manual path still available. If that piece does not earn its keep, you have spent a small amount finding out, and the rest of the plan should change.',
  },
  {
    question: 'How do you choose which AI model to use?',
    answer:
      'Cost per token, latency, context window, and how much of your data is allowed to leave your infrastructure. That last one comes first and often settles it before the others are considered, because some workloads should never touch a hosted API. After that it is empirical: I run the actual task against two or three candidates with real inputs and compare the outputs, because benchmark rankings say very little about whether a model handles your particular mess of a document. The architecture keeps the model behind an interface, so swapping it later is a configuration change rather than a rebuild. That matters because the rankings move every few months.',
  },
  {
    question: 'What kind of work do you turn down?',
    answer:
      'Projects where the goal is to have used AI rather than to fix something. If a process is stable, low volume and nobody is complaining about it, automating it costs more than it returns and I will say so. I also turn down work where the automation would make a consequential decision about a person without a human able to see and overturn it, because I have spent a decade building decision systems in a regulated industry and know how those fail. And I do not take on work I cannot test, which in practice means projects where nobody can tell me what a correct outcome looks like.',
  },
  {
    question: 'What happens after launch?',
    answer:
      'Support is included on every package: 7 days on Starter, 14 on Professional, 30 on Enterprise. That covers anything broken and small adjustments, not new features. After that you can take it in-house, because you own the code and I document it for somebody who is not me, or keep me on a retainer. Automations in particular need someone watching: they sit between systems you do not control, and an API that changes its response shape on a Tuesday will break something quietly. Most clients on integration work stay on a small retainer for exactly that reason.',
  },
  {
    question: 'How do you know whether a process is worth automating?',
    answer:
      'Multiply how long it takes by how often it happens, then ask what it costs when it goes wrong. A task that takes two minutes and runs four hundred times a month is worth more attention than one that takes a day and runs twice a year. Then look at whether the inputs are consistent enough that a rule can decide, or messy enough to need a model, or genuinely require a person. If the answer is a person, the automation should be everything around the decision, so that when they arrive the information is assembled and the outcome is recorded. Removing the person from a judgement call is usually where these projects go wrong.',
  },
  {
    question: 'What does the IBM ODM background have to do with AI work?',
    answer:
      'IBM Operational Decision Manager is an enterprise rules engine, and I have built decision automation on it at Bell Canada since 2020. The relevance is that it teaches you which decisions must never be probabilistic. A rules engine gives an answer you can trace to the rule that produced it and explain to an auditor two years later; a language model gives an answer that is usually right and cannot be explained that way. Most real systems need both, and the value is in knowing where the line goes. Engineers who only know one side tend to put everything on their side of it.',
  },
  {
    question: 'Can you work with the team we already have?',
    answer:
      'Working alongside an existing team is usually the better outcome. Your developers know the domain and will still be there when I am not. The arrangement that works is that I build the part that needs the specific experience, the integration layer or the AI component, alongside them rather than in isolation, and hand it over with documentation aimed at the person who inherits it. I also review code and set up the testing if that is the gap. What does not work is being handed a sealed specification and told not to talk to anybody, because the useful questions only surface in conversation with whoever does the work today.',
  },
];
