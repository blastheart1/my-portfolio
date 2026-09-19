import { getProviderKey } from '@/lib/credentials-store';
import { callAnthropic, callOpenAI, parseJson } from '@/lib/llm/transport';
import { checkGuardRails } from '@/lib/chatbot/guardRails';

import type { DemoNote, Draft, DraftResult, Verdict, BodySegment, Fabrication } from './types';
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

/**
 * Splits [[inferred]] spans out so the UI can highlight them, and attaches the
 * auditor's reason to any span it questioned.
 *
 * The reason is the point. A highlight that says only "this was inferred"
 * leaves the reader to work out what to check; "Confirm that the conversation
 * happened yesterday" tells them. The verdict already carries these — until
 * now they only appeared in a list underneath, detached from the phrase.
 */
export function segmentBody(body: string, fabrications: Fabrication[] = []): BodySegment[] {
  const segments: BodySegment[] = [];
  const pattern = /\[\[(.+?)\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > last) segments.push({ text: body.slice(last, match.index) });
    segments.push({ text: match[1], flagged: true, reason: reasonFor(match[1], fabrications) });
    last = match.index + match[0].length;
  }
  if (last < body.length) segments.push({ text: body.slice(last) });

  const flagged = segments.length > 0 ? segments : [{ text: body }];

  // A fabrication the model did not bracket still needs surfacing: match it
  // against the plain runs and split them so the phrase can be highlighted.
  return fabrications.reduce(splitOnFabrication, flagged);
}

/** Case-insensitive lookup of the auditor's note for a phrase. */
function reasonFor(text: string, fabrications: Fabrication[]): string | undefined {
  const needle = text.trim().toLowerCase();
  return fabrications.find(f => {
    const claim = f.text.trim().toLowerCase();
    return claim === needle || needle.includes(claim) || claim.includes(needle);
  })?.why;
}

/** Splits any unflagged run containing a fabrication so the phrase can be marked. */
function splitOnFabrication(segments: BodySegment[], fabrication: Fabrication): BodySegment[] {
  const claim = fabrication.text.trim();
  if (!claim) return segments;

  return segments.flatMap(segment => {
    if (segment.flagged) return segment;
    const index = segment.text.toLowerCase().indexOf(claim.toLowerCase());
    if (index === -1) return segment;

    const before = segment.text.slice(0, index);
    const hit = segment.text.slice(index, index + claim.length);
    const after = segment.text.slice(index + claim.length);

    return [
      ...(before ? [{ text: before }] : []),
      { text: hit, flagged: true, reason: fabrication.why },
      ...(after ? [{ text: after }] : []),
    ];
  });
}

// callOpenAI, callAnthropic and parseJson used to live here. They moved to
// src/lib/llm/transport.ts when the blog publish gate needed the same three,
// and a second copy would have been free to drift on timeout and error
// handling. Behaviour is unchanged; this file's tests are what proves it.

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

  const raw = await callOpenAI(key, DRAFT_MODEL, systemPrompt(note), instruction);
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
    // Empty rather than invented: with no auditor there is nothing to report,
    // and a plausible-looking list nobody produced is worse than none.
    changes: [],
    styleScore: 0,
    styleNotes: '',
    auditorProvider: null,
    attempts: 1,
  };

  const key = await getProviderKey('anthropic');
  if (!key) return unaudited;

  const draftText = draft.body.map(s => s.text).join('');
  const raw = await callAnthropic(
    key,
    AUDIT_MODEL,
    [
      'You audit a drafted email against the transcript it came from.',
      'Find claims in the draft that the transcript does not support: invented',
      'dates, names, numbers, links, or commitments. Text already wrapped in',
      '[[brackets]] is flagged as inferred and is not a fabrication.',
      'Be strict but not pedantic — ordinary connective phrasing is not a claim.',
      '',
      'Also report what the draft did to the note, so the sender can review it:',
      'assumptions they must confirm before sending (a blank link, a guessed',
      'date, a missing recipient) and changes made deliberately (tightened',
      'filler, applied a structure). Mark the first kind needsLook: true.',
      '',
      'Reply as JSON: {"faithful": boolean, "accuracy": number between 0 and 1,',
      '"fabrications": [{"text": string, "severity": "high"|"medium"|"low", "why": string}],',
      '"omissions": [string],',
      '"changes": [{"text": string, "needsLook": boolean}],',
      '"styleScore": number between 0 and 1, "styleNotes": string}',
    ].join('\n'),
    `Transcript:\n${note.transcript}\n\nDraft:\nSubject: ${draft.subject}\n\n${draftText}`
  );

  const parsed = parseJson<Partial<Verdict>>(raw, {});
  const fabrications = Array.isArray(parsed.fabrications) ? parsed.fabrications : [];
  const changes = Array.isArray(parsed.changes) ? parsed.changes : [];

  return {
    faithful: parsed.faithful ?? true,
    accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : 1,
    fabrications,
    omissions: Array.isArray(parsed.omissions) ? parsed.omissions : [],
    // Every fabrication is by definition something to confirm, so it appears
    // in the review list too. Deduplicated by text, since the auditor often
    // reports the same span in both places.
    changes: [
      ...fabrications
        .filter(f => !changes.some(c => c.text.includes(f.text)))
        .map(f => ({ text: `${f.why} ("${f.text}")`, needsLook: true })),
      ...changes,
    ],
    styleScore: typeof parsed.styleScore === 'number' ? parsed.styleScore : 0,
    styleNotes: typeof parsed.styleNotes === 'string' ? parsed.styleNotes : '',
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
        changes: [],
        styleScore: 0,
        styleNotes: '',
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

  // Re-segment now that the audit has run. The draft was segmented before the
  // verdict existed, so its flagged spans carried no reasons; this is what
  // binds each highlight to what the auditor actually questioned.
  if (verdict.fabrications.length > 0) {
    draft = {
      ...draft,
      body: segmentBody(draft.body.map(s => s.text).join(''), verdict.fabrications),
    };
  }

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
