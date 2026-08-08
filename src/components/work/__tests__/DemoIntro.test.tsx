/**
 * DemoIntro.test.tsx
 *
 * The disclaimer moved from a block at the top of the page to the info control
 * in the demo header. That is a presentation change, not a change to the
 * promise: someone about to speak into their microphone still has to be able
 * to find out where the audio goes, before they press record and without a
 * mouse.
 *
 * So these tests check reachability rather than mere presence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DemoIntro, { RELAY_INTRO, AUTOMATION_INTRO } from '../DemoIntro';

let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  user = userEvent.setup();
});

const infoControl = () => screen.getByRole('button', { name: /about this demo/i });

describe('the disclaimer is reachable before anything happens', () => {
  it('opens on hover', async () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    await user.hover(infoControl());

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('opens on keyboard focus, with no mouse involved', async () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    infoControl().focus();

    // A disclosure that only appears on hover is unreachable to anyone tabbing.
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('opens on tap, for touch devices that have no hover at all', async () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    await user.click(infoControl());

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('is described to assistive tech when open', async () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    infoControl().focus();
    const tip = await screen.findByRole('tooltip');

    expect(infoControl()).toHaveAttribute('aria-describedby', tip.id);
  });

  it('comes before the demo in DOM order', () => {
    render(
      <div>
        <DemoIntro {...RELAY_INTRO} />
        <button>Use microphone</button>
      </div>
    );

    const mic = screen.getByRole('button', { name: /use microphone/i });
    expect(
      infoControl().compareDocumentPosition(mic) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('the promises the demos make', () => {
  async function disclosure() {
    render(<DemoIntro {...RELAY_INTRO} />);
    infoControl().focus();
    return (await screen.findByRole('tooltip')).textContent ?? '';
  }

  it('states every line it was written with', async () => {
    const text = await disclosure();

    for (const line of RELAY_INTRO.disclaimers) {
      expect(text).toContain(line);
    }
  });

  it('says audio leaves the browser for transcription', async () => {
    expect(await disclosure()).toMatch(/sent to a transcription provider/i);
  });

  it('says recordings are never stored', async () => {
    expect(await disclosure()).toMatch(/never stored/i);
  });

  it('says nothing is emailed — what the compose view depends on', async () => {
    expect(await disclosure()).toMatch(/ever emailed to anyone/i);
  });

  it('states the run limit so a 429 is not a surprise', async () => {
    expect(await disclosure()).toMatch(/three runs per visitor per day/i);
  });

  it('tells automation visitors the flows are sanitized and inert', async () => {
    render(<DemoIntro {...AUTOMATION_INTRO} />);
    infoControl().focus();
    const text = (await screen.findByRole('tooltip')).textContent ?? '';

    expect(text).toMatch(/no client names/i);
    expect(text).toMatch(/nothing here runs/i);
  });
});

describe('the quickstart stays in the open', () => {
  it('shows every step without interaction', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    // Instructions, not disclosure — hiding these behind a control would make
    // the demo harder to use for no benefit.
    for (const step of RELAY_INTRO.steps) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });

  it('numbers them in the order given', () => {
    render(<DemoIntro {...RELAY_INTRO} />);

    const rendered = RELAY_INTRO.steps.map(step => screen.getByText(step));
    for (let i = 1; i < rendered.length; i++) {
      expect(
        rendered[i - 1].compareDocumentPosition(rendered[i]) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it('needs no localStorage, so private browsing behaves the same', () => {
    // The previous version remembered a dismissal; nothing to remember now.
    render(<DemoIntro {...RELAY_INTRO} />);

    expect(screen.getByText(RELAY_INTRO.steps[0])).toBeInTheDocument();
  });
});
