'use client';

import * as React from 'react';
import { Loader2, ShieldCheck, ShieldAlert, Mail, Eye, Info } from 'lucide-react';

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
import RelayInbox from './RelayInbox';

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

      <div className="p-4 sm:p-6">
        {/* The examples as an inbox, not a select. A dropdown hid what they
            were until you opened it and gave no sense that each demonstrates
            something different, which is the only reason there are three. */}
        <RelayInbox
          rows={notes.map(note => ({
            note,
            status:
              result && !usingCapture && note.id === selectedId
                ? result.status === 'ready'
                  ? ('Draft ready' as const)
                  : ('Needs review' as const)
                : undefined,
          }))}
          selectedId={usingCapture ? null : selectedId}
          disabled={running || transcribing}
          onSelect={id => {
            setSelectedId(id);
            setCaptured(null);
            setCaptureText('');
            setCaptureSegments([]);
            setResult(null);
            setError(null);
          }}
        />

        <div className="mt-6 min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {result?.draft.subject ?? selected?.suggestedSubject ?? 'Draft review'}
            {result && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-normal ${
                  result.status === 'ready'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                }`}
              >
                {result.status === 'ready' ? 'Draft ready' : 'Needs review'}
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {usingCapture
              ? 'From your recording · captured just now'
              : selected
                ? `${selected.context} · example`
                : 'Pick an example, record, or upload a clip'}
          </p>
        </div>

        {/* Tone, length and model on one row, as in the reference. */}
        <div className="mt-5 flex flex-wrap items-end gap-5">
          <Segmented label="Tone" options={TONES} value={tone} onChange={setTone} disabled={running} />
          <Segmented label="Length" options={LENGTHS} value={length} onChange={setLength} disabled={running} />
          <div>
            <span className="block text-[11px] uppercase tracking-wide text-gray-400">Model</span>
            <p className="mt-1 py-1 text-sm text-gray-600 dark:text-gray-400">
              {providers.length === 0 ? 'None configured' : providers.map(p => p.label).join(' + ')}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <RecorderPanel onCaptured={onCaptured} busy={running || transcribing} />
        </div>

        {transcribing && (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Transcribing…
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
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
            {running ? 'Drafting…' : result ? 'Redraft' : 'Draft the reply'}
          </button>

          {quota && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {quota.remaining} of {quota.limit} runs left today
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Voice note beside the draft, as in the reference. The review panels
            sit underneath both, spanning the full width, because they describe
            the relationship between the two rather than either one. */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:items-start">
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

          {result ? (
            <DraftPanel result={result} />
          ) : (
            <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 dark:border-gray-700">
              The drafted email, the assumptions it made, and the faithfulness
              check will appear here.
            </div>
          )}
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
  // Never assume the shape of a network response: an older or partial verdict
  // reaching .filter() takes the whole panel down, which is the failure this
  // demo can least afford — it renders after the visitor has spent a run.
  const changes = Array.isArray(verdict.changes) ? verdict.changes : [];
  const needLook = changes.filter(c => c.needsLook).length;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 dark:border-gray-700">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
          <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
            <Mail className="size-3.5" aria-hidden="true" />
            Drafted email
          </h3>
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
              <div
                key={field}
                className="flex items-center gap-3 border-b border-gray-50 py-1.5 last:border-0 dark:border-gray-800"
              >
                <span className="w-12 shrink-0 text-xs text-gray-400">{field}</span>
                <input
                  type="text"
                  aria-label={field}
                  placeholder={field === 'To' ? 'Add recipient email' : 'Optional'}
                  className="w-full bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none dark:text-gray-100"
                />
              </div>
            ))}
            <div className="flex items-center gap-3 py-1.5">
              <span className="w-12 shrink-0 text-xs text-gray-400">Subject</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{draft.subject}</span>
            </div>
            <p className="pt-2 text-xs text-gray-400">
              This compose view is for looking at. Nothing is sent.
            </p>
          </div>
        )}

        <div className="px-4 py-4">
          {view === 'review' && (
            <p className="mb-3 font-medium text-gray-900 dark:text-gray-100">{draft.subject}</p>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
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
      </section>

      {/* What Relay changed and assumed. The count is the point: it tells the
          sender how much of this needs a decision before it can go out. */}
      {changes.length > 0 && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700">
          <header className="flex flex-wrap items-baseline gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Info className="size-4 text-gray-400" aria-hidden="true" />
              What Relay changed &amp; assumed
            </h3>
            {needLook > 0 && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                · {needLook} need a look
              </span>
            )}
          </header>

          <ul className="divide-y divide-gray-50 px-4 dark:divide-gray-800">
            {changes.map((change, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    change.needsLook
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  }`}
                >
                  {change.needsLook ? '!' : '✓'}
                </span>
                <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {/* Stated in words too, so the icon is not the only signal. */}
                  <span className="sr-only">
                    {change.needsLook ? 'Needs a look: ' : 'Done: '}
                  </span>
                  {change.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Faithfulness check. Never a green tick by default — an unaudited draft
          says so, because claiming a check that did not run is worse than
          admitting there was none. */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700">
        <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {clean ? (
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            )}
            Faithfulness check
          </h3>

          {audited ? (
            <>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  clean
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                }`}
              >
                {clean ? 'Grounded' : `${verdict.fabrications.length} to confirm`}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs tabular-nums text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {Math.round(verdict.accuracy * 100)}% accurate
              </span>
              <span className="ml-auto text-xs text-gray-400">
                audited by {verdict.auditorProvider}
              </span>
            </>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Not audited
            </span>
          )}
        </header>

        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {!audited
              ? 'No second provider is configured, so this draft was not checked against the transcript.'
              : clean
                ? 'Every name, date, link and claim in the draft is grounded in the voice note.'
                : 'Some claims could not be traced back to the note. They are highlighted in the draft — hover one to see what the auditor questioned.'}
          </p>

          {audited && verdict.styleNotes && (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                Accuracy {Math.round(verdict.accuracy * 100)}%
                {verdict.styleScore > 0 && <> · Style {Math.round(verdict.styleScore * 100)}%</>}
              </p>
              <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                {verdict.styleNotes}
              </p>
            </div>
          )}

          {verdict.fabrications.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
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
    </div>
  );
}
