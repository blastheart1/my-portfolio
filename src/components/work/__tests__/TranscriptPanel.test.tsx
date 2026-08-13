/**
 * TranscriptPanel.test.tsx
 *
 * The panel used max-h-80, so its height followed its content. Switching from a
 * two-segment example to a three-segment one grew it, pushed everything below
 * down, and scrolled the page under the pointer mid-click.
 *
 * A fixed height means the surrounding layout never moves.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TranscriptPanel from '../TranscriptPanel';
import type { TranscriptSegment } from '@/lib/demo/relay/types';

function segments(count: number): TranscriptSegment[] {
  return Array.from({ length: count }, (_, i) => ({
    start: i * 15,
    time: `0:${String(i * 15).padStart(2, '0')}`,
    text: `Segment ${i} with enough text to occupy a line or two of the panel.`,
  }));
}

/** The scrolling region, which is what has to be a constant size. */
function scrollRegion(container: HTMLElement) {
  return container.querySelector('.overflow-y-auto') as HTMLElement;
}

describe('height never depends on content', () => {
  it('takes its height from the row rather than from what is in it', () => {
    const { container } = render(<TranscriptPanel transcript="x" segments={segments(2)} />);

    const region = scrollRegion(container);
    // Was a fixed h-80. Now the drafted email beside it sets the row height and
    // this fills it: a fixed value left a short note floating in whitespace and
    // a long one clipped at an arbitrary point. min-h-0 is what actually lets a
    // flex child shrink below its content and scroll.
    expect(region.className).toContain('flex-1');
    expect(region.className).toContain('min-h-0');
    // Checked as class tokens, not as a regex over the string: /\bh-\d/ also
    // matches inside "min-h-0", because a hyphen counts as a word boundary.
    const tokens = region.className.split(/\s+/);
    expect(tokens.filter(t => /^(sm:)?(h|max-h)-/.test(t))).toEqual([]);
  });

  it('stretches the card to the row instead of sizing to content', () => {
    const { container } = render(<TranscriptPanel transcript="x" segments={segments(2)} />);

    const card = container.querySelector('section')!;
    expect(card.className).toContain('h-full');
    expect(card.className).toContain('flex-col');
  });

  it('hides the scrollbar, since the card is already visibly cut off', () => {
    const { container } = render(<TranscriptPanel transcript="x" segments={segments(20)} />);

    // A second scrollbar inside a bordered card reads as chrome rather than as
    // an affordance.
    expect(scrollRegion(container).className).toContain('scrollbar-hide');
  });

  it('is the same class list for two segments and for eight', () => {
    const { container: small } = render(<TranscriptPanel transcript="x" segments={segments(2)} />);
    const { container: large } = render(<TranscriptPanel transcript="x" segments={segments(8)} />);

    expect(scrollRegion(small).className).toBe(scrollRegion(large).className);
  });

  it('scrolls overflow instead of growing', () => {
    const { container } = render(<TranscriptPanel transcript="x" segments={segments(20)} />);

    expect(scrollRegion(container).className).toContain('overflow-y-auto');
  });
});

describe('controls stay put', () => {
  it('keeps the player outside the scrolling region', () => {
    const { container } = render(
      <TranscriptPanel transcript="x" segments={segments(20)} audioURL="blob:x" />
    );

    const audio = container.querySelector('audio')!;
    // Inside the scroll area, the player would scroll away exactly when a long
    // transcript makes you want it.
    expect(scrollRegion(container).contains(audio)).toBe(false);
  });

  it('keeps the header outside it too', () => {
    const { container } = render(<TranscriptPanel transcript="x" segments={segments(20)} />);

    expect(scrollRegion(container).contains(screen.getByText(/voice note/i))).toBe(false);
  });
});

describe('content', () => {
  it('renders a timestamp and its text per segment', () => {
    render(<TranscriptPanel transcript="x" segments={segments(3)} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText(/Segment 2/)).toBeInTheDocument();
  });

  it('falls back to the plain transcript when there are no segments', () => {
    render(<TranscriptPanel transcript="Just the raw text." />);

    expect(screen.getByText('Just the raw text.')).toBeInTheDocument();
  });

  it('only makes timestamps clickable when there is audio to seek', () => {
    render(<TranscriptPanel transcript="x" segments={segments(3)} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('makes them buttons once a recording exists', () => {
    render(<TranscriptPanel transcript="x" segments={segments(3)} audioURL="blob:x" />);

    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('says what a timestamp will do, on hover and on focus', async () => {
    const user = userEvent.setup();
    render(<TranscriptPanel transcript="x" segments={segments(3)} audioURL="blob:x" />);

    await user.hover(screen.getAllByRole('button')[1]);

    // Without this the timestamps look like decoration; nothing else suggests
    // they are interactive.
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Jump to 0:15 in the recording');
  });
});
