import type { TranscriptSegment } from './types';

/**
 * Whisper returns one segment per breath — dozens for a minute of speech,
 * which reads as a wall of near-empty rows. Merging them into ~13 second
 * chunks gives the readable `0:00 / 0:21 / 0:46` gutter.
 *
 * Ported from the Relay app's transcribe.ts, with `formatClock` inlined so this
 * module has no dependencies and can be tested without a provider.
 */

/** Seconds to `m:ss`. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function groupSegments(
  raw: Array<{ start: number; text: string }>,
  targetSeconds = 13
): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  let bucketStart = 0;
  let buffer: string[] = [];

  for (const segment of raw) {
    if (buffer.length === 0) bucketStart = segment.start;
    const text = segment.text.trim();
    if (text) buffer.push(text);

    if (segment.start - bucketStart >= targetSeconds && buffer.length > 0) {
      out.push({ start: bucketStart, time: formatClock(bucketStart), text: buffer.join(' ') });
      buffer = [];
    }
  }

  if (buffer.length) {
    out.push({ start: bucketStart, time: formatClock(bucketStart), text: buffer.join(' ') });
  }

  return out;
}
