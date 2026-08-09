/**
 * Relay demo types.
 *
 * A trimmed version of the original app's domain model: the demo has no auth,
 * no settings and no saved style samples, so those fields are gone rather than
 * carried along unused.
 */

export type NoteStatus = 'ready' | 'needs_review' | 'error';
export type Severity = 'high' | 'medium' | 'low';
export type Tone = 'Warm' | 'Neutral' | 'Direct';
export type Length = 'Concise' | 'Standard' | 'Detailed';

/** A claim in the draft the transcript does not support. */
export interface Fabrication {
  text: string;
  severity: Severity;
  why: string;
}

/**
 * One thing the draft did to the note: an assumption worth confirming, or a
 * change made deliberately.
 *
 * `needsLook` is the distinction that matters. Tightening filler is a decision
 * the sender can skim; leaving a link blank because it was referenced but never
 * spoken is something they have to act on before sending.
 */
export interface DraftChange {
  text: string;
  needsLook: boolean;
}

export interface Verdict {
  faithful: boolean;
  /** 0..1, how accurately the draft reflects what was actually said. */
  accuracy: number;
  fabrications: Fabrication[];
  omissions: string[];
  /** What was changed or assumed, for the review panel. */
  changes: DraftChange[];
  /** 0..1, how well the draft matches the sender's voice. */
  styleScore: number;
  /** One line on where the voice matched and where it did not. */
  styleNotes: string;
  auditorProvider: string | null;
  /** 1 = clean first pass; 2 = one repair ran. */
  attempts: number;
  reviewNote?: string;
}

/**
 * A run of body text. `flagged` runs are things the model inferred rather than
 * heard — a guessed date, a placeholder link — and are highlighted so the
 * sender sees them before sending.
 */
export interface BodySegment {
  text: string;
  flagged?: boolean;
  /**
   * What the auditor wants confirmed about this phrase. Present only when the
   * audit matched a fabrication to it; a span the model merely bracketed as
   * inferred has no reason attached, because none was given.
   */
  reason?: string;
}

export interface Draft {
  subject: string;
  body: BodySegment[];
  provider: string | null;
  model: string | null;
}

/** One readable, timestamped chunk of a transcript. */
export interface TranscriptSegment {
  /** Seconds from the start, for seeking the audio element. */
  start: number;
  /** The same value as `m:ss`, for display. */
  time: string;
  text: string;
}

/** What the reply is: shown as the row label in the inbox. */
export type NoteKind = 'Follow-up' | 'Intro' | 'Reply' | 'Note';

export interface DemoNote {
  id: string;
  kind: NoteKind;
  /** Relative time shown in the inbox. Static, since these are examples. */
  captured: string;
  /** Who the reply is to. */
  correspondent: string;
  context: string;
  transcript: string;
  /** Timestamped chunks. Seeded notes carry static ones so the panel looks
   *  identical without a recording. */
  segments?: TranscriptSegment[];
  suggestedSubject: string;
  tone: Tone;
  length: Length;
}

export interface DraftResult {
  draft: Draft;
  verdict: Verdict;
  status: NoteStatus;
  /** True when no provider key resolved and a stored example was returned. */
  degraded: boolean;
}
