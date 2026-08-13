'use client';

import * as React from 'react';
import { Mic } from 'lucide-react';

import type { TranscriptSegment } from '@/lib/demo/relay/types';
import Tooltip from '@/components/ui/tooltip';

/**
 * The voice note: a player, and the transcript beside a timestamp gutter.
 *
 * Clicking a timestamp seeks the audio. That only works because the recording
 * blob is kept in the browser for the session — the original app shows
 * "Playback coming soon — audio storage isn't wired up yet" here, having
 * discarded it. Keeping an object URL costs nothing and buys the whole
 * interaction.
 *
 * Falls back to plain paragraphs when there are no segments, which is the case
 * for a seeded note without static timings.
 *
 * Height comes from the row rather than a fixed value: the drafted email beside
 * it decides how tall the row is, and the transcript matches and scrolls. A
 * fixed height here left a short note floating in whitespace and a long one
 * clipped at an arbitrary point. The scrollbar is hidden because the panel is
 * already visibly cut off at the fold, and a second scrollbar inside a bordered
 * card reads as chrome rather than as an affordance.
 */
export default function TranscriptPanel({
  transcript,
  segments,
  audioURL,
  durationLabel,
}: {
  transcript: string;
  segments?: TranscriptSegment[];
  audioURL?: string | null;
  durationLabel?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const seek = (seconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = seconds;
    void el.play().catch(() => {
      // Autoplay policies can refuse this; the seek still lands, which is the
      // part that matters.
    });
  };

  return (
    <section className="flex h-full min-h-[16rem] flex-col rounded-lg border border-gray-200 dark:border-gray-700">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
          <Mic className="size-3.5" aria-hidden="true" />
          Voice note
        </h3>
        {durationLabel && (
          <span className="text-xs tabular-nums text-gray-400">{durationLabel}</span>
        )}
      </header>

      {audioURL && (
        <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <audio ref={audioRef} controls src={audioURL} className="w-full" />
        </div>
      )}

      {/* Fills whatever the row leaves and scrolls, rather than a fixed height.
          min-h-0 is what lets a flex child shrink below its content; without it
          this grows and the card stretches instead of scrolling. The header and
          player sit outside so the controls never scroll away. */}
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {segments && segments.length > 0 ? (
          <ol className="space-y-3">
            {segments.map(segment => (
              <li key={`${segment.start}-${segment.time}`} className="flex gap-4">
                {audioURL ? (
                  // Wrapped rather than a title attribute: a native tooltip is
                  // slow to appear, unstyled, and never shows on focus, and
                  // this is the affordance that tells you the timestamps do
                  // anything at all.
                  <span className="shrink-0 pt-0.5">
                    <Tooltip
                      content={`Jump to ${segment.time} in the recording`}
                      className="font-mono text-xs tabular-nums text-gray-400 transition-colors
                                 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      <span onClick={() => seek(segment.start)}>{segment.time}</span>
                    </Tooltip>
                  </span>
                ) : (
                  <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-gray-400">
                    {segment.time}
                  </span>
                )}
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {segment.text}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{transcript}</p>
        )}
      </div>
    </section>
  );
}
