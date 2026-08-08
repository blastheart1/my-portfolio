import { NextRequest, NextResponse } from 'next/server';

import { withDemoQuota } from '@/lib/demo-visitor';
import { isDemoVisible } from '@/lib/content-queries';
import { getProviderKey } from '@/lib/credentials-store';
import { groupSegments } from '@/lib/demo/relay/segments';

/**
 * Voice note to text.
 *
 * The original app allowed 25 MB, which is OpenAI's own ceiling. That is fine
 * behind a login and far too generous on a public endpoint: it is an unpaid
 * upload sink long before it is a transcription cost. A minute of speech is
 * what the demo needs.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;

const ALLOWED_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
];

/**
 * Everything here is cheap and happens before a provider call, so it runs as a
 * precheck: a visitor who records 90 seconds by accident should not lose one of
 * three runs to a validation error. Abuse is bounded by the global ceiling, not
 * by charging for malformed requests.
 */
async function validate(request: NextRequest): Promise<NextResponse | null> {
  if (!(await isDemoVisible('demo_relay'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('audio');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing audio field' }, { status: 400 });
  }

  // Every check below runs before the provider call, so a rejected upload
  // costs nothing but the bytes already received.
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `That clip is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.` },
      { status: 400 }
    );
  }

  const baseType = file.type.split(';')[0].trim();
  if (!ALLOWED_TYPES.includes(baseType)) {
    return NextResponse.json({ error: 'That file is not an audio clip.' }, { status: 400 });
  }

  // Duration is declared by the recorder rather than parsed from the container.
  // It is advisory, which is why the byte cap above is the real limit.
  const declared = Number(form.get('seconds') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_AUDIO_SECONDS) {
    return NextResponse.json(
      { error: `That clip is ${Math.round(declared)}s. Keep it under ${MAX_AUDIO_SECONDS}s.` },
      { status: 400 }
    );
  }

  return null;
}

export const POST = withDemoQuota('relay-transcribe', async (request: NextRequest) => {
  // Re-read the body: validate() consumed its own copy. Cheap for a 5 MB cap.
  const form = await request.formData();
  const file = form.get('audio') as File;

  const key = await getProviderKey('openai');
  if (!key) {
    return NextResponse.json({
      text: '',
      segments: [],
      degraded: true,
      note: 'Transcription needs a provider key. Pick one of the example notes instead.',
    });
  }

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'note.webm');
  upstream.append('model', 'whisper-1');
  // Segment timestamps are what make the transcript scrubbable. verbose_json
  // is the only response format that carries them.
  upstream.append('response_format', 'verbose_json');
  upstream.append('timestamp_granularities[]', 'segment');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: upstream,
  });

  if (!res.ok) {
    // Thrown, not returned: withDemoQuota releases the reservation on a throw,
    // so a provider outage does not cost the visitor one of their three runs.
    throw new Error(`Transcription provider responded ${res.status}`);
  }

  const body = await res.json();
  const raw = (body.segments ?? []) as Array<{ start: number; text: string }>;

  return NextResponse.json({
    text: body.text ?? '',
    segments: groupSegments(raw),
    degraded: false,
  });
}, validate);
