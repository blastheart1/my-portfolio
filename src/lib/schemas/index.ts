/**
 * Validation schemas shared between the API route handlers and the admin
 * client forms.
 *
 * Previously each schema was declared inline in its route, so the client had
 * no way to validate before submitting and threw away the server's
 * `error.flatten()` in favour of a generic 'Save failed'. Lifting them here
 * lets react-hook-form's zodResolver use the exact same rules the server
 * enforces.
 *
 * ── IMPORTANT ─────────────────────────────────────────────────────────────
 * These MUST stay byte-for-byte equivalent to what the routes accepted
 * before. The redesign brief forbids API contract changes, and tightening a
 * schema here would start rejecting rows that already exist in the database.
 *
 * The handoff's shorter numbers (project title 60, tier name 20, …) are
 * *presentation* limits — the point at which text starts breaking the public
 * layout. They drive character counters, not validation, and live in
 * FIELD_LIMITS below.
 * ──────────────────────────────────────────────────────────────────────────
 */

export * from './projects';
export * from './experience';
export * from './services';
export * from './content';

/**
 * Soft character limits for counters, per the prototype.
 *
 * A counter turns warn at 85% and destructive at 100%, but exceeding one of
 * these never blocks a save — the server schema is the real boundary. They
 * exist because overflow degrades the public site's layout, not because the
 * data is invalid.
 */
export const FIELD_LIMITS = {
  project: {
    title: 60,
    description: 300,
  },
  hero: {
    name: 40,
    subtitle: 60,
    description: 160,
    cta_label: 30,
  },
  serviceTier: {
    name: 20,
    tagline: 40,
    outcome: 120,
    feature: 100,
    maxFeatures: 8,
  },
} as const;

/** Counter state for a value of `length` against a soft `limit`. */
export function counterTone(length: number, limit: number): 'normal' | 'warn' | 'over' {
  if (length >= limit) return 'over';
  if (length >= limit * 0.85) return 'warn';
  return 'normal';
}
