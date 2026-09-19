import { SITE_DOMAIN } from '@/lib/site';

/**
 * The shared Open Graph card.
 *
 * Every social and chat preview of this site is one of these. They were a
 * single site-level image, so a case study and a blog post shared a card that
 * said only "Antonio Luis Santos" — the least useful thing to show someone who
 * has just been sent a link to a specific piece of work.
 *
 * One builder rather than three copies: these are laid out by hand in inline
 * styles because Satori supports a subset of CSS, and three hand-tuned copies
 * of that would drift on the first change.
 *
 * Constraints worth knowing before editing:
 *   - Satori needs an explicit `display: flex` on anything with children, and
 *     silently mislays elements without it.
 *   - No external fonts are loaded. Fetching one at render time adds a
 *     build-and-request-time failure surface to an image, and the system stack
 *     renders fine at this size.
 *   - Long titles wrap; the line clamp keeps a three-line title from pushing
 *     the footer off the card.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export interface OgCardProps {
  /** Small monospace line above the title, e.g. "~/work $ cat relay". */
  eyebrow: string;
  title: string;
  /** One line under the title. Kept short; it is set at 26px. */
  subtitle?: string;
  /** Up to four short labels along the bottom. */
  chips?: readonly string[];
}

export function OgCard({ eyebrow, title, subtitle, chips = [] }: OgCardProps) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '72px 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(74,222,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 64,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
        <span style={{ color: '#6b7280', fontSize: 20, letterSpacing: '0.05em' }}>
          {SITE_DOMAIN}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 16,
          color: '#4ade80',
          letterSpacing: '0.08em',
          marginBottom: 24,
          display: 'flex',
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          // Steps down for a long title so a case-study headline still fits
          // without the footer sliding off the card.
          fontSize: title.length > 48 ? 52 : title.length > 30 ? 62 : 72,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          marginBottom: 20,
          display: 'flex',
          maxWidth: 1000,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 26,
            color: '#4ade80',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            marginBottom: 40,
            display: 'flex',
            maxWidth: 940,
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      )}

      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 12 }}>
          {chips.slice(0, 4).map(chip => (
            <div
              key={chip}
              style={{
                padding: '6px 16px',
                borderRadius: 999,
                border: '1px solid rgba(74,222,128,0.25)',
                color: 'rgba(74,222,128,0.8)',
                fontSize: 15,
                fontFamily: 'monospace',
                display: 'flex',
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Trims a description to something that fits on one or two lines. */
export function ogSubtitle(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  // Cut at a word boundary rather than mid-word.
  return `${clean.slice(0, clean.lastIndexOf(' ', max))}…`;
}
