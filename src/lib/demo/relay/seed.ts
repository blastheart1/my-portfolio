import type { DemoNote, DraftResult } from './types';

/**
 * The demo inbox.
 *
 * Each note carries static timestamped segments so the transcript panel looks
 * the same as it does for a real recording — a visitor who never grants
 * microphone access still sees the feature rather than a plain paragraph.
 *
 * Fictional correspondents and fictional situations. Nothing here is drawn
 * from real correspondence, which matters because this is a public page and
 * the whole point of the tool is that it writes in someone's actual voice.
 */

export const SEED_NOTES: DemoNote[] = [
  {
    id: 'lewis',
    correspondent: 'Lewis',
    context: 'Follow-up after an intro call about onboarding',
    transcript:
      "Okay, follow up to Lewis. Really good call yesterday, I enjoyed talking through the onboarding problems his team is hitting. Tell him I'm putting together a short page with a few example frameworks we've seen work for teams around his size. Not prescriptive, just starting points. And say I'm happy to jump on another call in the next week or two if he wants to go deeper, but no pressure either way.",
    segments: [
      { start: 0, time: '0:00', text: 'Okay, follow up to Lewis. Really good call yesterday, I enjoyed talking through the onboarding problems his team is hitting.' },
      { start: 14, time: '0:14', text: 'Tell him I\'m putting together a short page with a few example frameworks we\'ve seen work for teams around his size. Not prescriptive, just starting points.' },
      { start: 31, time: '0:31', text: 'And say I\'m happy to jump on another call in the next week or two if he wants to go deeper, but no pressure either way.' },
    ],
    suggestedSubject: 'Onboarding frameworks for your team',
    tone: 'Warm',
    length: 'Standard',
  },
  {
    id: 'testarossa',
    correspondent: 'Testarossa',
    context: 'Reply to a workflow document sent for review',
    transcript:
      "Reply to Testarossa about the workflow doc. Thank her for getting it over early, it genuinely makes my life easier. I've read through it, there's a lot of well thought out stuff in there. A few areas stood out where I think we could streamline, especially around the handoff between the sales development and account teams. Ask if she's free Thursday or Friday for a quick thirty minutes and I'll work around whatever times she sends.",
    segments: [
      { start: 0, time: '0:00', text: 'Reply to Testarossa about the workflow doc. Thank her for getting it over early, it genuinely makes my life easier.' },
      { start: 13, time: '0:13', text: 'I\'ve read through it, there\'s a lot of well thought out stuff in there. A few areas stood out where I think we could streamline, especially around the handoff between the sales development and account teams.' },
      { start: 32, time: '0:32', text: 'Ask if she\'s free Thursday or Friday for a quick thirty minutes and I\'ll work around whatever times she sends.' },
    ],
    suggestedSubject: 'Re: workflow doc review',
    tone: 'Neutral',
    length: 'Standard',
  },
  {
    id: 'rimuru',
    correspondent: 'Rimuru',
    context: 'Declining a partnership, keeping the door open',
    transcript:
      "Need to get back to Rimuru about the partnership idea. It's not a fit for us this quarter, we're heads down on the platform work and I don't want to commit to something we can't do properly. Be straight about that rather than vague. But I do think there's something here later in the year, so say I'd like to pick it up again once we're through this phase, and I mean that.",
    segments: [
      { start: 0, time: '0:00', text: 'Need to get back to Rimuru about the partnership idea. It\'s not a fit for us this quarter, we\'re heads down on the platform work and I don\'t want to commit to something we can\'t do properly.' },
      { start: 18, time: '0:18', text: 'Be straight about that rather than vague. But I do think there\'s something here later in the year, so say I\'d like to pick it up again once we\'re through this phase, and I mean that.' },
    ],
    suggestedSubject: 'Re: partnership',
    tone: 'Direct',
    length: 'Concise',
  },
];

export function findSeedNote(id: string): DemoNote | undefined {
  return SEED_NOTES.find(note => note.id === id);
}

/**
 * What the demo returns when no provider key resolves.
 *
 * A stored example rather than an error: someone landing on the page should
 * see what the tool produces even when it cannot run, and a 500 teaches them
 * nothing. `degraded` is set so the UI can say so plainly instead of passing
 * this off as a live result.
 */
export function degradedResult(note: DemoNote): DraftResult {
  return {
    draft: {
      subject: note.suggestedSubject,
      body: [
        { text: `Hi ${note.correspondent},\n\n` },
        {
          text:
            'This is a stored example rather than a live result — the demo has no model provider configured right now. ',
        },
        {
          text: 'With one connected, this is where the drafted reply appears, ',
        },
        { text: 'with anything inferred rather than heard highlighted like this', flagged: true },
        { text: ' so you can check it before sending.\n\nBest,\nLuis' },
      ],
      provider: null,
      model: null,
    },
    verdict: {
      faithful: true,
      accuracy: 1,
      fabrications: [],
      omissions: [],
      auditorProvider: null,
      attempts: 1,
    },
    status: 'ready',
    degraded: true,
  };
}
