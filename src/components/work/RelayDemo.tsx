'use client';

import * as React from 'react';
import { Loader2, ShieldCheck, ShieldAlert, Mail, Eye } from 'lucide-react';

import type {
  DemoNote,
  DraftResult,
  Tone,
  Length,
  TranscriptSegment,
} from '@/lib/demo/relay/types';
import Tooltip from '@/components/ui/tooltip';
import DemoIntro, { RELAY_INTRO } from './DemoIntro';
import RecorderPanel, { type CapturedAudio } from './RecorderPanel';
import TranscriptPanel from './TranscriptPanel';

/**
 * The Relay demo.
 *
 * Capture on the left, draft on the right. Three ways in — record, upload, or
 * pick an example — all converging on the same pipeline, so the interesting
 * part (a second vendor auditing the first) is reachable however you arrived.
 *
 * The verdict panel is written so the demo cannot flatter itself: no auditor
 * means "Not audited", not a green tick.
 */

const TONES: Tone[] = ['Warm', 'Neutral', 'Direct'];
const LENGTHS: Length[] = ['Concise', 'Standard', 'Detailed'];

interface Quota {
  limit: number;
  remaining: number;
  cooldownMinutes: number;
  retryAfterSeconds: number;
}

interface Provider {
  id: string;
  label: string;
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wide text-gray-400">{label}</span>
      <div role="group" aria-label={label} className="mt-1 inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
        {options.map(option => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={`rounded-[6px] px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
              option === value
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RelayDemo() {
  const [notes, setNotes] = React.useState<DemoNote[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [captured, setCaptured] = React.useState<CapturedAudio | null>(null);
  const [captureText, setCaptureText] = React.useState<string>('');
  const [captureSegments, setCaptureSegments] = React.useState<TranscriptSegment[]>([]);
  const [transcribing, setTranscribing] = React.useState(false);

  const [tone, setTone] = React.useState<Tone>('Warm');
  const [length, setLength] = React.useState<Length>('Standard');
  const [providers, setProviders] = React.useState<Provider[]>([]);

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

    fetch('/api/demo/quota?demo=relay').then(r => r.json()).then(setQuota).catch(() => {});
    fetch('/api/demo/models')
      .then(r => r.json())
      .then((body: { providers?: Provider[] }) =>
        setProviders(Array.isArray(body.providers) ? body.providers : [])
      )
      .catch(() => setProviders([]));
  }, []);

  const selected = notes.find(n => n.id === selectedId) ?? null;
  const usingCapture = captured !== null;

  const transcribe = React.useCallback(async (audio: CapturedAudio) => {
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('audio', audio.blob, audio.filename);
      form.append('seconds', String(audio.seconds));

      const res = await fetch('/api/demo/relay/transcribe', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? `Transcription failed (${res.status})`);
        return;
      }
      setCaptureText(body.text ?? '');
      setCaptureSegments(Array.isArray(body.segments) ? body.segments : []);
      if (body.degraded) setError(body.note ?? null);
    } catch {
      setError('Could not reach the demo. Try again in a moment.');
    } finally {
      setTranscribing(false);
    }
  }, []);

  const onCaptured = React.useCallback(
    (audio: CapturedAudio | null) => {
      setCaptured(audio);
      setResult(null);
      setCaptureText('');
      setCaptureSegments([]);
      if (audio) void transcribe(audio);
    },
    [transcribe]
  );

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    const payload = usingCapture
      ? { transcript: captureText, correspondent: 'there', tone, length }
      : { noteId: selected?.id, tone, length };

    try {
      const res = await fetch('/api/demo/relay/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body?.error ?? `Request failed (${res.status})`);
        return;
      }

      setResult(body as DraftResult);
      const remaining = res.headers.get('X-Demo-Remaining');
      if (remaining !== null) setQuota(q => (q ? { ...q, remaining: Number(remaining) } : q));
    } catch {
      setError('Could not reach the demo. Try again in a moment.');
    } finally {
      setRunning(false);
    }
  };

  const canDraft = usingCapture ? captureText.length > 0 && !transcribing : selected !== null;

  return (
    <>
      {/* Above the interface in DOM order, so it is read before anything is
          clicked and before any microphone prompt is possible. */}
      <DemoIntro {...RELAY_INTRO} />

      <div className="grid gap-0 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <aside className="border-b border-gray-200 p-4 lg:border-b-0 lg:border-r dark:border-gray-700">
          <h3 className="text-xs uppercase tracking-wide text-gray-400">Examples</h3>
          <ul className="mt-3 space-y-1">
            {notes.map(note => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(note.id);
                    setCaptured(null);
                    setCaptureText('');
                    setCaptureSegments([]);
                    setResult(null);
                    setError(null);
                  }}
                  aria-current={!usingCapture && note.id === selectedId}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    !usingCapture && note.id === selectedId
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

        <div className="space-y-5 p-4 sm:p-5">
          <RecorderPanel onCaptured={onCaptured} busy={running || transcribing} />

          {transcribing && (
            <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Transcribing…
            </p>
          )}

          {(usingCapture || selected) && (
            <TranscriptPanel
              transcript={usingCapture ? captureText : (selected?.transcript ?? '')}
              segments={usingCapture ? captureSegments : selected?.segments}
              audioURL={captured?.url}
              durationLabel={
                captured && captured.seconds > 0
                  ? `${Math.floor(captured.seconds / 60)}:${String(captured.seconds % 60).padStart(2, '0')}`
                  : undefined
              }
            />
          )}

          <div className="flex flex-wrap items-end gap-5">
            <Segmented label="Tone" options={TONES} value={tone} onChange={setTone} disabled={running} />
            <Segmented label="Length" options={LENGTHS} value={length} onChange={setLength} disabled={running} />

            <div>
              <span className="block text-[11px] uppercase tracking-wide text-gray-400">Model</span>
              <p className="mt-1 py-1 text-sm text-gray-600 dark:text-gray-400">
                {providers.length === 0
                  ? 'None configured'
                  : providers.map(p => p.label).join(' + ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void run()}
              disabled={running || !canDraft}
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
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {result && <DraftPanel result={result} />}
        </div>
      </div>
    </>
  );
}

function DraftPanel({ result }: { result: DraftResult }) {
  const { draft, verdict } = result;
  const [view, setView] = React.useState<'review' | 'email'>('review');
  const audited = verdict.auditorProvider !== null;
  const clean = audited && verdict.fabrications.length === 0;

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <h3 className="text-xs uppercase tracking-wide text-gray-400">Drafted email</h3>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {(['review', 'email'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-sm capitalize transition-colors ${
                view === mode
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              {mode === 'review' ? (
                <Eye className="size-3.5" aria-hidden="true" />
              ) : (
                <Mail className="size-3.5" aria-hidden="true" />
              )}
              {mode}
            </button>
          ))}
        </div>
      </header>

      {result.degraded && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No model provider is configured, so this is a stored example rather than a live result.
        </p>
      )}

      {view === 'email' && (
        <div className="border-b border-gray-100 px-4 py-3 text-sm dark:border-gray-800">
          {/* Composition only. There is deliberately no send control anywhere:
              a public endpoint that emails arbitrary recipients is an open
              relay, and a disabled button would only invite someone to look
              for the endpoint behind it. */}
          {(['To', 'CC', 'BCC'] as const).map(field => (
            <div key={field} className="flex items-center gap-3 border-b border-gray-50 py-1.5 last:border-0 dark:border-gray-800">
              <span className="w-12 shrink-0 text-xs text-gray-400">{field}</span>
              <input
                type="text"
                aria-label={field}
                placeholder={field === 'To' ? 'Add recipient email' : 'Optional'}
                className="w-full bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none dark:text-gray-100"
              />
            </div>
          ))}
          <p className="pt-2 text-xs text-gray-400">
            This compose view is for looking at. Nothing is sent.
          </p>
        </div>
      )}

      <div className="px-4 py-4">
        <p className="font-medium text-gray-900 dark:text-gray-100">{draft.subject}</p>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {draft.body.map((segment, i) =>
            segment.flagged ? (
              <Tooltip
                key={i}
                content={segment.reason ?? 'Inferred rather than heard — check this before sending.'}
                className="rounded bg-amber-100 px-0.5 underline decoration-amber-500 decoration-dotted
                           underline-offset-2 dark:bg-amber-900/60 dark:text-amber-100"
              >
                {segment.text}
              </Tooltip>
            ) : (
              <React.Fragment key={i}>{segment.text}</React.Fragment>
            )
          )}
        </p>
      </div>

      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
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
              : `${verdict.fabrications.length} claim${verdict.fabrications.length === 1 ? '' : 's'} the note does not support. Hover the highlights to see which.`}
        </p>

        {/* The tooltips carry these too, but a fabrication the repair pass
            removed from the body has no span left to hover — so the list stays
            as the complete record of what was rejected. */}
        {verdict.fabrications.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {verdict.fabrications.map((f, i) => (
              <li key={i}>
                <span className="font-medium">&ldquo;{f.text}&rdquo;</span> — {f.why}
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
