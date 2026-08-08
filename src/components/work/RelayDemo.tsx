'use client';

import * as React from 'react';
import { Loader2, ShieldCheck, ShieldAlert, Mic } from 'lucide-react';

import type { DemoNote, DraftResult, Tone } from '@/lib/demo/relay/types';
import DemoIntro, { RELAY_INTRO } from './DemoIntro';

/**
 * The Relay demo.
 *
 * Rebuilt against the portfolio's design rather than lifting the original
 * app's shell, sidebar and user menu, none of which mean anything without
 * accounts. Three panes: pick a note, see the transcript, read the draft.
 *
 * The verdict panel is the part worth looking at. It shows what the auditor
 * found, or says plainly that no auditor ran — never a green tick by default.
 */

const TONES: Tone[] = ['Warm', 'Neutral', 'Direct'];

interface Quota {
  limit: number;
  remaining: number;
  cooldownMinutes: number;
  retryAfterSeconds: number;
}

export default function RelayDemo() {
  const [notes, setNotes] = React.useState<DemoNote[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [tone, setTone] = React.useState<Tone>('Warm');
  const [result, setResult] = React.useState<DraftResult | null>(null);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [quota, setQuota] = React.useState<Quota | null>(null);

  React.useEffect(() => {
    fetch('/api/demo/relay/notes')
      .then(r => r.json())
      .then((body: { notes?: DemoNote[] }) => {
        // Never assume shape: an error body reaching .map() blanks the panel.
        const list = Array.isArray(body.notes) ? body.notes : [];
        setNotes(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch(() => setNotes([]));

    fetch('/api/demo/quota?demo=relay')
      .then(r => r.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  const selected = notes.find(n => n.id === selectedId) ?? null;

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/demo/relay/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ noteId: selected.id, tone }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body?.error ?? `Request failed (${res.status})`);
        return;
      }

      setResult(body as DraftResult);
      const remaining = res.headers.get('X-Demo-Remaining');
      if (remaining !== null) {
        setQuota(q => (q ? { ...q, remaining: Number(remaining) } : q));
      }
    } catch {
      setError('Could not reach the demo. Try again in a moment.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      {/* Above the interface, in DOM order, so it is read before anything is
          clicked and before any microphone prompt is possible. */}
      <DemoIntro {...RELAY_INTRO} />

      <div className="grid gap-0 md:grid-cols-[minmax(0,14rem)_1fr]">
      {/* Inbox */}
      <aside className="border-b border-gray-200 p-4 md:border-b-0 md:border-r dark:border-gray-700">
        <h3 className="text-xs uppercase tracking-wide text-gray-400">Inbox</h3>
        <ul className="mt-3 space-y-1">
          {notes.map(note => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(note.id);
                  setResult(null);
                  setError(null);
                }}
                aria-current={note.id === selectedId}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  note.id === selectedId
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                }`}
              >
                <span className="block font-medium">{note.correspondent}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {note.context}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="p-5">
        {selected && (
          <>
            {/* Capture — the transcript a recording would have produced. */}
            <section>
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                <Mic className="size-3.5" aria-hidden="true" />
                Voice note
              </h3>
              <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                {selected.transcript}
              </p>
            </section>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                Tone
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as Tone)}
                  className="rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                >
                  {TONES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void run()}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm
                           font-medium text-white transition-colors hover:bg-gray-700
                           disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900
                           dark:hover:bg-gray-200"
              >
                {running && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {running ? 'Drafting…' : 'Draft the reply'}
              </button>

              {quota && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {quota.remaining} of {quota.limit} runs left today
                </span>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {result && <DraftPanel result={result} />}
          </>
        )}
      </div>
      </div>
    </>
  );
}

function DraftPanel({ result }: { result: DraftResult }) {
  const { draft, verdict } = result;
  const audited = verdict.auditorProvider !== null;
  const clean = audited && verdict.fabrications.length === 0;

  return (
    <section className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-700">
      {result.degraded && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No model provider is configured, so this is a stored example rather than a live result.
        </p>
      )}

      <h3 className="text-xs uppercase tracking-wide text-gray-400">Draft</h3>
      <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">{draft.subject}</p>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {draft.body.map((segment, i) =>
          segment.flagged ? (
            // Inferred rather than heard. Marked in text as well as colour so
            // the distinction survives greyscale.
            <mark
              key={i}
              title="Inferred — check this before sending"
              className="rounded bg-amber-100 px-0.5 dark:bg-amber-900/60 dark:text-amber-100"
            >
              {segment.text}
            </mark>
          ) : (
            <React.Fragment key={i}>{segment.text}</React.Fragment>
          )
        )}
      </p>

      <div className="mt-5 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          {clean ? (
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          )}
          {audited ? `Audited by ${verdict.auditorProvider}` : 'Not audited'}
        </h4>

        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {!audited
            ? 'No second provider is configured, so this draft was not checked against the transcript.'
            : clean
              ? `Every claim traced back to the note. Accuracy ${Math.round(verdict.accuracy * 100)}%.`
              : `${verdict.fabrications.length} claim${verdict.fabrications.length === 1 ? '' : 's'} the note does not support.`}
        </p>

        {verdict.fabrications.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {verdict.fabrications.map((f, i) => (
              <li key={i}>
                <span className="font-medium">“{f.text}”</span> — {f.why}
              </li>
            ))}
          </ul>
        )}

        {verdict.attempts > 1 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Redrafted once after the first audit failed.
          </p>
        )}

        {verdict.reviewNote && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{verdict.reviewNote}</p>
        )}
      </div>
    </section>
  );
}
