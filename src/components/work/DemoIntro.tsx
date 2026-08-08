'use client';

import * as React from 'react';
import { Info } from 'lucide-react';

import Tooltip from '@/components/ui/tooltip';

/**
 * The header above every demo: what it is, how to use it, and — behind the
 * info control — what it does with your data.
 *
 * One component for both demos so they cannot drift apart, and so a change to
 * what the disclaimer promises is a change in one place.
 *
 * The disclaimer sits behind an icon rather than owning the top of the page,
 * but it is still *reachable before anything happens*: the control comes before
 * the demo in DOM order, opens on hover, on keyboard focus and on tap, and is
 * adjacent to the record button. Someone about to speak into their microphone
 * can find out where the audio goes without hunting for a privacy policy.
 *
 * The quickstart stays in the open. It is instructions, not disclosure.
 */

export interface DemoIntroProps {
  /** Short statements of fact, behind the info control. */
  disclaimers: string[];
  /** Three steps, in order. Always visible. */
  steps: string[];
}

export default function DemoIntro({ disclaimers, steps }: DemoIntroProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full
                         bg-gray-100 text-xs tabular-nums text-gray-600
                         dark:bg-gray-800 dark:text-gray-400"
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <Tooltip
        content={disclaimers.join('\n\n')}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200
                   px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:text-gray-900
                   dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <Info className="size-3.5" aria-hidden="true" />
        About this demo
      </Tooltip>
    </div>
  );
}

/** Kept beside the component so copy and contract change together. */
export const RELAY_INTRO: DemoIntroProps = {
  disclaimers: [
    'This is a portfolio demonstration, not a product.',
    'Three runs per visitor per day, with five minutes between them, because each one calls paid models.',
    'Recordings stay in your browser. They are never stored, and reloading the page loses them.',
    'Audio is sent to a transcription provider to be turned into text. Nothing else leaves your browser.',
    'Nothing is ever emailed to anyone — the compose view is for looking at, not sending.',
  ],
  steps: [
    'Record, upload, or pick an example.',
    'Choose a tone and draft the reply.',
    'Hover the highlights to see what the auditor questioned.',
  ],
};

export const AUTOMATION_INTRO: DemoIntroProps = {
  disclaimers: [
    'These are real workflows built for live businesses, generalised — no client names, systems, or figures.',
    'Nothing here runs. It is a map of how the automations are put together.',
  ],
  steps: [
    'Pick a workflow from the list.',
    'Drag to pan, scroll to zoom.',
    'Click any step to see why it is a rule rather than a model.',
  ],
};
