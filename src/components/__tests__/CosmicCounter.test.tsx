/**
 * CosmicCounter.test.tsx
 *
 * A starfield-filled statistic. The behaviours worth pinning:
 *   - the field is deterministic, so SSR and client agree (Math.random here
 *     would produce a hydration mismatch on every load)
 *   - the number is announced once, not on every animation frame
 *   - reduced motion still shows the value, just without the count-up
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import CosmicCounter from '../CosmicCounter';
import { ScrollProvider } from '@/contexts/ScrollContext';

/** IntersectionObserver stub whose callback we can fire on demand. */
let triggerIntersect: (() => void) | null = null;

class MockIntersectionObserver {
  constructor(private cb: IntersectionObserverCallback) {
    triggerIntersect = () =>
      this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
}

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }))
  );
}

const renderCounter = (props: Partial<React.ComponentProps<typeof CosmicCounter>> = {}) =>
  render(
    <ScrollProvider>
      <CosmicCounter value={1034} caption="Brainwaves about space design." {...props} />
    </ScrollProvider>
  );

beforeEach(() => {
  triggerIntersect = null;
  setReducedMotion(false);
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('accessibility', () => {
  it('announces the final value once, not the animating digits', () => {
    // Without this a screen reader would read every intermediate number as
    // the count-up runs.
    renderCounter();
    expect(screen.getByLabelText('1,034')).toBeInTheDocument();
  });

  it('includes the suffix in the announced value', () => {
    renderCounter({ value: 250, suffix: '+' });
    expect(screen.getByLabelText('250+')).toBeInTheDocument();
  });

  it('renders the caption as real text', () => {
    renderCounter();
    expect(screen.getByText('Brainwaves about space design.')).toBeInTheDocument();
  });

  it('hides the decorative sparkle from assistive tech', () => {
    const { container } = renderCounter();
    const svg = container.querySelector('svg');
    expect(svg?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('count-up', () => {
  it('starts at zero before the number scrolls into view', () => {
    renderCounter();
    expect(screen.getByLabelText('1,034').textContent).toBe('0');
  });

  it('counts to the final value once visible', async () => {
    renderCounter();

    await React.act(async () => {
      triggerIntersect?.();
    });

    await waitFor(
      () => expect(screen.getByLabelText('1,034').textContent).toBe('1,034'),
      { timeout: 3000 }
    );
  });

  it('formats with thousands separators', async () => {
    renderCounter({ value: 12345 });
    await React.act(async () => triggerIntersect?.());

    await waitFor(
      () => expect(screen.getByLabelText('12,345').textContent).toBe('12,345'),
      { timeout: 3000 }
    );
  });
});

describe('reduced motion', () => {
  it('shows the value immediately rather than animating to it', async () => {
    setReducedMotion(true);
    renderCounter();

    await React.act(async () => triggerIntersect?.());

    // The information is the point; the animation is not.
    expect(screen.getByLabelText('1,034').textContent).toBe('1,034');
  });

  it('does not attach the looping sparkle animation', () => {
    setReducedMotion(true);
    const { container } = renderCounter();
    expect(container.querySelector('.cosmic-sparkle')).toBeNull();
    expect(container.querySelector('.cosmic-trail')).toBeNull();
  });
});

describe('starfield determinism — guards against hydration mismatch', () => {
  const fieldOf = (container: HTMLElement) =>
    (container.querySelector('.cosmic-counter-number') as HTMLElement)?.style.backgroundImage;

  it('produces an identical field across renders with the same seed', () => {
    const a = render(
      <ScrollProvider>
        <CosmicCounter value={100} seed={7} />
      </ScrollProvider>
    );
    const first = fieldOf(a.container);
    a.unmount();

    const b = render(
      <ScrollProvider>
        <CosmicCounter value={100} seed={7} />
      </ScrollProvider>
    );
    // Math.random() here would differ between server and client and throw a
    // hydration error on every page load.
    expect(fieldOf(b.container)).toBe(first);
  });

  it('produces a different field for a different seed', () => {
    const a = render(
      <ScrollProvider>
        <CosmicCounter value={100} seed={1} />
      </ScrollProvider>
    );
    const first = fieldOf(a.container);
    a.unmount();

    const b = render(
      <ScrollProvider>
        <CosmicCounter value={100} seed={99} />
      </ScrollProvider>
    );
    expect(fieldOf(b.container)).not.toBe(first);
  });

  it('clips the field to the glyphs', () => {
    const { container } = renderCounter();
    const el = container.querySelector('.cosmic-counter-number') as HTMLElement;

    expect(el.style.backgroundClip || el.style.webkitBackgroundClip).toBe('text');
    expect(el.style.color).toBe('transparent');
  });

  it('generates the stars as gradients, not an image request', () => {
    // No network asset means nothing to 404 and nothing to blur when scaled.
    const { container } = renderCounter();
    const field = fieldOf(container) ?? '';

    expect(field).toContain('radial-gradient');
    expect(field).not.toContain('url(');
  });
});
