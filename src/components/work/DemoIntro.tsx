'use client';

import * as React from 'react';
import { Info, ChevronDown } from 'lucide-react';

/**
 * The disclaimer and quickstart that sit above every demo.
 *
 * One component for both demos so they cannot drift apart, and so a change to
 * what the disclaimer promises is a change in one place.
 *
 * The disclaimer is never collapsible. A visitor is about to speak into their
 * microphone, and where that audio goes has to be readable before they press
 * record — not folded behind a control they have no reason to open. The
 * quickstart does collapse, because it is genuinely noise on a second visit.
 */

const SEEN_KEY = 'demo-quickstart-seen';

export interface DemoIntroProps {
  /** Short statements of fact. Rendered as a list, always visible. */
  disclaimers: string[];
  /** Three steps, in order. */
  steps: string[];
}

export default function DemoIntro({ disclaimers, steps }: DemoIntroProps) {
  // Starts open, then closes on mount if this visitor has seen it. Rendering
  // open first keeps the server and client markup identical; deciding from
  // localStorage during render would be a hydration mismatch.
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) === '1') setOpen(false);
      else window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Private mode, or storage disabled. Leaving it open is the safe default.
    }
  }, []);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3 p-5">
        <Info
          className="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Before you start
          </h3>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {disclaimers.map(line => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="demo-quickstart"
          className="flex w-full items-center justify-between gap-2 text-left text-sm
                     font-medium text-gray-700 dark:text-gray-300"
        >
          How this works
          <ChevronDown
            className={`size-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ol
            id="demo-quickstart"
            className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
          >
            {steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full
                             bg-gray-100 text-xs tabular-nums text-gray-600
                             dark:bg-gray-800 dark:text-gray-400"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
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
    'Record a voice note, upload one, or pick one of the examples.',
    'Choose a tone and press Draft the reply.',
    'Hover anything highlighted in the draft to see what the auditor questioned and why.',
  ],
};

export const AUTOMATION_INTRO: DemoIntroProps = {
  disclaimers: [
    'These are real workflows built for live businesses, generalised — no client names, systems, or figures.',
    'Nothing here runs. It is a map of how the automations are put together.',
  ],
  steps: [
    'Pick a workflow from the list.',
    'Drag to pan, scroll to zoom. The controls bottom-left reset the view.',
    'Click any step to see what goes in, what comes out, and why it is a rule rather than a model.',
  ],
};
