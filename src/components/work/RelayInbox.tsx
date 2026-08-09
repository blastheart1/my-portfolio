'use client';

import * as React from 'react';

import type { DemoNote } from '@/lib/demo/relay/types';

/**
 * The example notes, as an inbox.
 *
 * This replaced a select. A dropdown hid what the examples were until you
 * opened it, and gave no sense that each one demonstrates something different
 * — which is the only reason there are three. A list shows all of them at once
 * with enough of the note to tell them apart.
 *
 * Each row is a button rather than a link: choosing a note changes the state of
 * the demo below, it does not navigate.
 */

const STATUS_STYLE: Record<string, string> = {
  'Draft ready': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  'Needs review': 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  Example: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export interface InboxRow {
  note: DemoNote;
  /** Set once a draft exists for this note. */
  status?: 'Draft ready' | 'Needs review';
}

export default function RelayInbox({
  rows,
  selectedId,
  onSelect,
  disabled,
}: {
  rows: InboxRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(({ note, status }) => {
          const active = note.id === selectedId;

          return (
            <li key={note.id}>
              <button
                type="button"
                disabled={disabled}
                aria-current={active}
                onClick={() => onSelect(note.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors
                            disabled:opacity-50 sm:gap-4 ${
                              active
                                ? 'bg-gray-50 dark:bg-gray-800/60'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                            }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    status === 'Needs review' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />

                <span className="w-28 shrink-0 max-sm:hidden">
                  <span className="block text-[11px] uppercase tracking-wide text-gray-400">
                    {note.kind}
                  </span>
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {note.correspondent}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {note.suggestedSubject}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
                    <span className="sm:hidden">{note.correspondent} · </span>
                    {note.transcript}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-xs text-gray-400">{note.captured}</span>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                      STATUS_STYLE[status ?? 'Example']
                    }`}
                  >
                    {status ?? 'Example'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-gray-100 px-4 py-2.5 text-center text-xs text-gray-400 dark:border-gray-800">
        Drafts are generated on demand and held here for review — nothing sends.
      </p>
    </div>
  );
}
