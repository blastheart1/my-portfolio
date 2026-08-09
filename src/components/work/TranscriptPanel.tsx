'use client';

import * as React from 'react';
import { Mic } from 'lucide-react';

import type { TranscriptSegment } from '@/lib/demo/relay/types';

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
    <section className="rounded-lg border border-gray-200 dark:border-gray-700">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
          <Mic className="size-3.5" aria-hidden="true" />
          Voice note
        </h3>
        {durationLabel && (
          <span className="text-xs tabular-nums text-gray-400">{durationLabel}</span>
        )}
      </header>

      {audioURL && (
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <audio ref={audioRef} controls src={audioURL} className="w-full" />
        </div>
      )}

      {/* Fixed height, not max-height. With max-h the panel grew and shrank
          as you switched between notes with different segment counts, pushing
          everything below it and scrolling the page under the pointer. The
          header and player sit outside this region so the controls never
          scroll away. */}
      <div className="h-56 overflow-y-auto px-4 py-3 sm:h-80">
        {segments && segments.length > 0 ? (
          <ol className="space-y-3">
            {segments.map(segment => (
              <li key={`${segment.start}-${segment.time}`} className="flex gap-4">
                {audioURL ? (
                  <button
                    type="button"
                    onClick={() => seek(segment.start)}
                    aria-label={`Play from ${segment.time}`}
                    className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-gray-400
                               transition-colors hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    {segment.time}
                  </button>
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
