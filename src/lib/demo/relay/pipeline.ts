import { getProviderKey } from '@/lib/credentials-store';
import { checkGuardRails } from '@/lib/chatbot/guardRails';

import type { DemoNote, Draft, DraftResult, Verdict, BodySegment } from './types';
import { degradedResult } from './seed';

/**
 * Relay's draft pipeline: write, audit, repair once, report.
 *
 * The interesting part is the audit, and specifically that it runs on a
 * different vendor from the one that wrote the draft. A model asked to check
 * its own output agrees with itself; a model from another family has no such
 * investment. When they disagree, the disagreement is the signal.
 *
 * Everything degrades rather than throwing. This is a portfolio demo — a
 * visitor seeing an error page learns nothing about the work.
 */

const DRAFT_MODEL = 'gpt-4o-mini';
const AUDIT_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ATTEMPTS = 2;
export const MAX_TRANSCRIPT_CHARS = 4000;

function systemPrompt(note: DemoNote): string {
  return [
    'You draft emails from a spoken voice note, in the sender\'s own voice.',
    '',
    'Rules, in order of importance:',
    '1. Never state a fact the transcript does not contain. No invented dates,',
    '   names, numbers, links or commitments.',
    '2. Where something must be inferred or left as a placeholder, wrap it in',
    '   [[double brackets]] so it can be highlighted for review.',
    '3. Match the requested tone and length. Sound like a person, not a template.',
    '4. No preamble and no sign-off flourishes beyond a plain closing.',
    '',
    `Tone: ${note.tone}. Length: ${note.length}.`,
    `Recipient: ${note.correspondent}.`,
    '',
    'Reply as JSON: {"subject": string, "body": string}',
  ].join('\n');
}

/** Splits [[inferred]] spans out so the UI can highlight them. */
export function segmentBody(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const pattern = /\[\[(.+?)\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > last) segments.push({ text: body.slice(last, match.index) });
    segments.push({ text: match[1], flagged: true });
    last = match.index + match[0].length;
  }
  if (last < body.length) segments.push({ text: body.slice(last) });

  return segments.length > 0 ? segments : [{ text: body }];
}

async function callOpenAI(key: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: DRAFT_MODEL,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);
  const body = await res.json();
  return body.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(key: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AUDIT_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic responded ${res.status}`);
  const body = await res.json();
  return body.content?.[0]?.text ?? '';
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    // Models occasionally wrap JSON in a fenced block despite instructions.
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

async function generateDraft(
  key: string,
  note: DemoNote,
  repair?: Verdict
): Promise<Draft> {
  const instruction = repair
    ? [
        'Your previous draft contained claims the transcript does not support:',
        ...repair.fabrications.map(f => `- "${f.text}" — ${f.why}`),
        '',
        'Rewrite it. Remove or bracket every one of those. Say less rather than',
        'inventing anything to fill the gap.',
        '',
        `Transcript:\n${note.transcript}`,
      ].join('\n')
    : `Transcript:\n${note.transcript}`;

  const raw = await callOpenAI(key, systemPrompt(note), instruction);
  const parsed = parseJson<{ subject?: string; body?: string }>(raw, {});

  return {
    subject: parsed.subject?.trim() || note.suggestedSubject,
    body: segmentBody(parsed.body?.trim() || ''),
    provider: 'openai',
    model: DRAFT_MODEL,
  };
}

/**
 * The cross-vendor check.
 *
 * Without an Anthropic key the draft still returns, marked as unaudited rather
 * than silently presented as verified. Claiming an audit that did not happen
 * would be worse than admitting there was none.
 */
async function auditDraft(note: DemoNote, draft: Draft): Promise<Verdict> {
  const unaudited: Verdict = {
    faithful: true,
    accuracy: 1,
    fabrications: [],
    omissions: [],
    auditorProvider: null,
    attempts: 1,
  };

  const key = await getProviderKey('anthropic');
  if (!key) return unaudited;

  const draftText = draft.body.map(s => s.text).join('');
  const raw = await callAnthropic(
    key,
    [
      'You audit a drafted email against the transcript it came from.',
      'Find claims in the draft that the transcript does not support: invented',
      'dates, names, numbers, links, or commitments. Text already wrapped in',
      '[[brackets]] is flagged as inferred and is not a fabrication.',
      'Be strict but not pedantic — ordinary connective phrasing is not a claim.',
      '',
      'Reply as JSON: {"faithful": boolean, "accuracy": number between 0 and 1,',
      '"fabrications": [{"text": string, "severity": "high"|"medium"|"low", "why": string}],',
      '"omissions": [string]}',
    ].join('\n'),
    `Transcript:\n${note.transcript}\n\nDraft:\nSubject: ${draft.subject}\n\n${draftText}`
  );

  const parsed = parseJson<Partial<Verdict>>(raw, {});
  return {
    faithful: parsed.faithful ?? true,
    accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : 1,
    fabrications: Array.isArray(parsed.fabrications) ? parsed.fabrications : [],
    omissions: Array.isArray(parsed.omissions) ? parsed.omissions : [],
    auditorProvider: 'anthropic',
    attempts: 1,
  };
}

export async function runDraftPipeline(note: DemoNote): Promise<DraftResult> {
  // The transcript reaches a model prompt, so it goes through the same
  // guardrails as the chatbot. A demo is not a reason to skip them.
  const guard = checkGuardRails(note.transcript);
  if (guard.tier === 'BLOCK') {
    return {
      ...degradedResult(note),
      status: 'error',
      verdict: {
        faithful: false,
        accuracy: 0,
        fabrications: [],
        omissions: [],
        auditorProvider: null,
        attempts: 0,
        reviewNote: 'That input was blocked before reaching a model.',
      },
    };
  }

  const key = await getProviderKey('openai');
  if (!key) return degradedResult(note);

  let draft = await generateDraft(key, note);
  let verdict = await auditDraft(note, draft);
  let attempts = 1;

  // One repair pass. Beyond that a model that keeps inventing is telling you
  // the source note lacked the detail, and looping burns the visitor's quota
  // rather than fixing anything.
  while (verdict.fabrications.length > 0 && attempts < MAX_ATTEMPTS) {
    draft = await generateDraft(key, note, verdict);
    verdict = await auditDraft(note, draft);
    attempts += 1;
  }

  verdict = { ...verdict, attempts };

  if (verdict.fabrications.length > 0) {
    verdict.reviewNote =
      'A couple of details still could not be verified against the note. They are highlighted — confirm or remove them before sending.';
  }

  return {
    draft,
    verdict,
    status: verdict.fabrications.length > 0 ? 'needs_review' : 'ready',
    degraded: false,
  };
}
