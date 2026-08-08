'use client';

import * as React from 'react';
import { Mic, Square, Trash2, Upload, MicOff } from 'lucide-react';

import { useRecorder, MAX_SECONDS, extForMime } from '@/lib/demo/relay/useRecorder';

/**
 * Capture: record in the browser, or upload a clip you already have.
 *
 * Permission is treated as four outcomes rather than one error string, because
 * they need different things from the visitor:
 *
 *   idle         an explicit button — the prompt never fires on page load
 *   requesting   name the browser dialog so it is not mistaken for a hang
 *   denied       how to undo it, plus the two paths that still work. Browsers
 *                will not re-prompt after a denial, so a retry button that
 *                silently does nothing is worse than no button.
 *   unsupported  hide recording entirely; upload and examples remain
 *
 * The upload path exists partly for that denied case, and partly because a
 * laptop microphone in a quiet room is not everyone's situation.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
];

function mmss(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export interface CapturedAudio {
  blob: Blob;
  url: string;
  seconds: number;
  filename: string;
}

export default function RecorderPanel({
  onCaptured,
  busy,
}: {
  onCaptured: (audio: CapturedAudio | null) => void;
  busy?: boolean;
}) {
  const rec = useRecorder();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Hand the finished recording up once, when it is ready.
  React.useEffect(() => {
    if (rec.recState === 'recorded' && rec.blob && rec.audioURL) {
      onCaptured({
        blob: rec.blob,
        url: rec.audioURL,
        seconds: rec.recSecs,
        filename: `voice-note.${extForMime(rec.blob.type)}`,
      });
    }
    // onCaptured is intentionally excluded: parents pass an inline callback,
    // and depending on it would re-fire this on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.recState, rec.blob, rec.audioURL, rec.recSecs]);

  const handleFile = (file: File) => {
    setUploadError(null);

    const baseType = file.type.split(';')[0].trim();
    if (!ALLOWED_TYPES.includes(baseType)) {
      setUploadError('That is not an audio file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        `That clip is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`
      );
      return;
    }

    onCaptured({
      blob: file,
      url: URL.createObjectURL(file),
      seconds: 0,
      filename: file.name || 'upload',
    });
  };

  const recording = rec.recState === 'recording';

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-3">
        {rec.recState === 'unsupported' ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This browser cannot record audio. Upload a clip or pick an example below.
          </p>
        ) : (
          <button
            type="button"
            onClick={rec.toggle}
            disabled={busy || rec.recState === 'requesting' || rec.recState === 'denied'}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                        transition-colors disabled:opacity-50 ${
                          recording
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200'
                        }`}
          >
            {recording ? (
              <>
                <Square className="size-4" aria-hidden="true" />
                Stop
              </>
            ) : rec.recState === 'denied' ? (
              <>
                <MicOff className="size-4" aria-hidden="true" />
                Microphone blocked
              </>
            ) : (
              <>
                <Mic className="size-4" aria-hidden="true" />
                {rec.recState === 'requesting' ? 'Waiting for permission…' : 'Use microphone'}
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || recording}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2
                     text-sm transition-colors hover:bg-gray-50 disabled:opacity-50
                     dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <Upload className="size-4" aria-hidden="true" />
          Upload a clip
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="sr-only"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {recording && (
          <span className="flex items-center gap-2 text-sm tabular-nums text-gray-600 dark:text-gray-300">
            <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            {mmss(rec.recSecs)} / {mmss(MAX_SECONDS)}
          </span>
        )}

        {rec.recState === 'recorded' && (
          <button
            type="button"
            onClick={() => {
              rec.discard();
              onCaptured(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors
                       hover:text-red-600 dark:text-gray-400"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Discard
          </button>
        )}
      </div>

      {/* Level meter: proof the microphone is live, which a timer alone does
          not give you. */}
      {recording && (
        <div className="mt-3 flex h-8 items-end gap-0.5" aria-hidden="true">
          {rec.levels.map((level, i) => (
            <span
              key={i}
              className="w-full rounded-sm bg-gray-300 dark:bg-gray-600"
              style={{ height: `${Math.max(4, level * 100)}%` }}
            />
          ))}
        </div>
      )}

      {rec.recState === 'denied' && (
        <p role="alert" className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Your browser is blocking microphone access for this site. To record, allow it in the
          site settings beside the address bar and reload. Uploading a clip or picking an example
          works either way.
        </p>
      )}

      {rec.recError && rec.recState !== 'denied' && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {rec.recError}
        </p>
      )}

      {uploadError && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}
    </div>
  );
}
