'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Progress toast for on-device model setup.
 *
 * This can only animate because training yields to the browser between batches
 * (tf.nextFrame() in tensorflowModel.trainModel). A synchronous fit() would
 * block the main thread and freeze this mid-render.
 */

export type TrainingPhase = 'downloading' | 'training' | 'ready' | 'error';

interface TrainingToastProps {
  phase: TrainingPhase | null;
  /** 0..1, only meaningful during 'training'. */
  progress?: number;
  onDismiss?: () => void;
}

const PHASE_COPY: Record<TrainingPhase, { title: string; detail: string }> = {
  downloading: {
    title: 'Preparing on-device assistant',
    detail: 'Downloading the model — the chat is already usable.',
  },
  training: {
    title: 'Setting up on-device answers',
    detail: 'This runs once and is saved for next time.',
  },
  ready: {
    title: 'On-device answers enabled',
    detail: 'Common questions are now answered instantly, offline.',
  },
  error: {
    title: 'Could not enable on-device answers',
    detail: 'No problem — the chat keeps working as normal.',
  },
};

export default function TrainingToast({ phase, progress = 0, onDismiss }: TrainingToastProps) {
  const copy = phase ? PHASE_COPY[phase] : null;
  const showBar = phase === 'training' || phase === 'downloading';
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <AnimatePresence>
      {copy && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-40 right-4 md:bottom-28 md:right-6 z-50 w-[min(20rem,calc(100vw-2rem))]
                     rounded-xl border border-black/10 dark:border-white/10
                     bg-white/95 dark:bg-neutral-900/95 backdrop-blur
                     shadow-lg p-4"
          // Progress chatter should not interrupt a screen reader mid-sentence.
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {phase === 'ready' ? (
                <span aria-hidden="true" className="text-green-600 dark:text-green-400">✓</span>
              ) : phase === 'error' ? (
                <span aria-hidden="true" className="text-amber-600 dark:text-amber-400">!</span>
              ) : (
                <span
                  aria-hidden="true"
                  className="block h-4 w-4 rounded-full border-2 border-[var(--color-brand,#3b82f6)] border-t-transparent animate-spin"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {copy.title}
                {phase === 'training' && pct > 0 && (
                  <span className="ml-1 tabular-nums text-neutral-500 dark:text-neutral-400">
                    {pct}%
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                {copy.detail}
              </p>

              {showBar && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <motion.div
                    className="h-full rounded-full bg-[var(--color-brand,#3b82f6)]"
                    initial={{ width: 0 }}
                    animate={{
                      // Downloading has no measurable progress; show a slim
                      // indeterminate sliver rather than a fake percentage.
                      width: phase === 'training' ? `${pct}%` : '30%',
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>

            {onDismiss && (phase === 'ready' || phase === 'error') && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-1 text-neutral-400 hover:text-neutral-700
                           dark:hover:text-neutral-200 focus:outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--color-brand,#3b82f6)]"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
