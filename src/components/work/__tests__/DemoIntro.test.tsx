/**
 * DemoIntro.test.tsx
 *
 * A visitor is about to speak into their microphone. Where that audio goes has
 * to be readable before they press record — so the disclaimer is not
 * collapsible, and it comes before the interface in DOM order rather than
 * merely above it visually.
 *
 * The quickstart does collapse, because it is noise on a second visit.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DemoIntro, { RELAY_INTRO, AUTOMATION_INTRO } from '../DemoIntro';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the disclaimer is always readable', () => {
  it('renders every line without any interaction', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    for (const line of RELAY_INTRO.disclaimers) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it('has no control that could hide it', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    // Exactly one toggle exists, and it belongs to the quickstart.
    const toggles = screen.getAllByRole('button');
    expect(toggles).toHaveLength(1);
    expect(toggles[0]).toHaveAccessibleName(/how this works/i);
  });

  it('stays visible after the quickstart is collapsed', async () => {
    const user = userEvent.setup();
    render(<DemoIntro {...RELAY_INTRO} />);

    await user.click(screen.getByRole('button', { name: /how this works/i }));

    expect(screen.getByText(RELAY_INTRO.disclaimers[0])).toBeInTheDocument();
  });

  it('survives localStorage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });

    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(RELAY_INTRO.disclaimers[0])).toBeInTheDocument();
  });
});

describe('quickstart', () => {
  it('is open on a first visit', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(RELAY_INTRO.steps[0])).toBeInTheDocument();
  });

  it('collapses on the next visit', () => {
    const { unmount } = render(<DemoIntro {...RELAY_INTRO} />);
    unmount();

    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.queryByText(RELAY_INTRO.steps[0])).toBeNull();
  });

  it('can be reopened after it has collapsed', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DemoIntro {...RELAY_INTRO} />);
    unmount();
    render(<DemoIntro {...RELAY_INTRO} />);

    await user.click(screen.getByRole('button', { name: /how this works/i }));

    expect(screen.getByText(RELAY_INTRO.steps[0])).toBeInTheDocument();
  });

  it('renders the steps as an ordered list, in the order given', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    const rendered = RELAY_INTRO.steps.map(step => screen.getByText(step));
    // Document order must match the array order, or "step 2" is not step 2.
    for (let i = 1; i < rendered.length; i++) {
      expect(
        rendered[i - 1].compareDocumentPosition(rendered[i]) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});

describe('the promises the demos make', () => {
  it('tells the visitor audio leaves the browser, before they can record', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(/sent to a transcription provider/i)).toBeInTheDocument();
  });

  it('says recordings are not stored', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(/never stored/i)).toBeInTheDocument();
  });

  it('says nothing is emailed — the guarantee the compose view depends on', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(/ever emailed to anyone/i)).toBeInTheDocument();
  });

  it('states the run limit so a 429 is not a surprise', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(/three runs per visitor per day/i)).toBeInTheDocument();
  });

  it('tells automation visitors the flows are sanitized and inert', () => {
    render(<DemoIntro {...AUTOMATION_INTRO} />);

    expect(screen.getByText(/no client names/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here runs/i)).toBeInTheDocument();
  });
});
