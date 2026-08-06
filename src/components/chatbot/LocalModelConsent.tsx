'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Opt-in prompt for the on-device intent classifier.
 *
 * Shown inside the chat window rather than as a blocking modal: the chat is
 * fully usable without the local model, so this must never gate conversation.
 * Declining is a first-class choice and is remembered.
 *
 * The costs are stated plainly because they are real — a ~1 MB download and a
 * one-time setup pass on the visitor's device.
 */
interface LocalModelConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function LocalModelConsent({ onAccept, onDecline }: LocalModelConsentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-3 mb-3 rounded-lg border border-black/10 dark:border-white/10
                 bg-neutral-50 dark:bg-neutral-800/60 p-3"
      role="region"
      aria-label="Optional on-device assistant"
    >
      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
        Enable faster, on-device answers?
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        Downloads about 1&nbsp;MB and sets up once on your device, then answers
        common questions instantly without a network round trip. The chat works
        either way — this is optional.
      </p>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-md bg-[var(--color-brand,#3b82f6)] px-3 py-1.5 text-[11px] font-medium
                     text-white transition-opacity hover:opacity-90
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                     focus-visible:ring-[var(--color-brand,#3b82f6)]"
        >
          Enable
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded-md px-3 py-1.5 text-[11px] font-medium
                     text-neutral-600 dark:text-neutral-300
                     hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60
                     focus:outline-none focus-visible:ring-2
                     focus-visible:ring-[var(--color-brand,#3b82f6)]"
        >
          No thanks
        </button>
      </div>
    </motion.div>
  );
}
