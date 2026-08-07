/**
 * ChromeReveal.test.tsx
 *
 * The floating chrome (nav pill, theme switch, chat launcher) sat on top of
 * the cosmic hero and competed with it. It now fades in as the hero resolves.
 *
 * The failure modes worth pinning are not the fade itself but its edges: chrome
 * that never appears on a page with no hero, chrome that stays focusable while
 * invisible, and chrome that is unreachable for a visitor who has asked for
 * reduced motion (the hero animation is skipped for them entirely, so a
 * scroll-gated reveal would never fire).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import ChromeReveal from '../ChromeReveal';

let subscriber: ((y: number) => void) | null = null;
let scrollY = 0;

vi.mock('@/contexts/ScrollContext', () => ({
  useScrollY: () => ({
    subscribe: (cb: (y: number) => void) => {
      subscriber = cb;
      return () => { subscriber = null; };
    },
    getScrollY: () => scrollY,
  }),
}));

const reducedMotion = vi.fn(() => false);
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => reducedMotion(),
}));

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

/** Hero geometry: 1000px tall starting at the top, over a 400px viewport. */
function mountHero() {
  const hero = document.createElement('div');
  hero.setAttribute('data-hero-scene', '');
  Object.defineProperty(hero, 'offsetTop', { value: 0, configurable: true });
  Object.defineProperty(hero, 'offsetHeight', { value: 1000, configurable: true });
  document.body.appendChild(hero);
  return hero;
}

function scrollTo(y: number) {
  scrollY = y;
  act(() => subscriber?.(y));
}

beforeEach(() => {
  subscriber = null;
  scrollY = 0;
  reducedMotion.mockReturnValue(false);
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  window.innerHeight = 400;
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function renderChrome(expectHero = true) {
  const { container } = render(
    <ChromeReveal expectHero={expectHero}>
      <button>Toggle theme</button>
    </ChromeReveal>
  );
  return container.firstElementChild as HTMLElement;
}

describe('with a hero to wait for', () => {
  // travel = 1000 - 400 = 600. Reveal spans 0.88*600 = 528 to 600 + 0.25*400 = 700.
  beforeEach(mountHero);

  it('is hidden at the top of the page', () => {
    const el = renderChrome();
    expect(el.style.opacity).toBe('0');
  });

  it('is still hidden partway through the hero', () => {
    const el = renderChrome();
    scrollTo(400);
    expect(el.style.opacity).toBe('0');
  });

  it('fades in partially as the hero resolves', () => {
    const el = renderChrome();
    scrollTo(600);
    const v = Number(el.style.opacity);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  it('is fully visible once the content has arrived', () => {
    const el = renderChrome();
    scrollTo(750);
    expect(el.style.opacity).toBe('1');
  });

  it('hides again when scrolled back to the hero', () => {
    const el = renderChrome();
    scrollTo(750);
    scrollTo(0);
    expect(el.style.opacity).toBe('0');
  });
});

describe('invisible chrome is not interactive', () => {
  beforeEach(mountHero);

  it('takes no pointer events and no tab stop while hidden', () => {
    const el = renderChrome();
    expect(el.style.pointerEvents).toBe('none');
    // visibility:hidden is what removes the button from the tab order; opacity
    // alone would leave it focusable and clickable over the hero.
    expect(el.style.visibility).toBe('hidden');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('becomes interactive once revealed', () => {
    const el = renderChrome();
    scrollTo(750);
    expect(el.style.pointerEvents).toBe('');
    expect(el.style.visibility).toBe('');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('pages and users without a hero reveal', () => {
  it('shows immediately when the page has no hero', () => {
    const el = renderChrome(false);
    expect(el.style.opacity).toBe('1');
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeVisible();
  });

  it('shows immediately on a hero page whose hero was toggled off in the admin', () => {
    // expectHero is true, but nothing in the DOM carries data-hero-scene.
    const el = renderChrome(true);
    expect(el.style.opacity).toBe('1');
  });

  it('shows immediately under reduced motion, where the hero never advances', () => {
    mountHero();
    reducedMotion.mockReturnValue(true);

    const el = renderChrome();

    expect(el.style.opacity).toBe('1');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('degenerate geometry', () => {
  it('shows the chrome when the hero is shorter than the viewport', () => {
    const hero = mountHero();
    Object.defineProperty(hero, 'offsetHeight', { value: 200, configurable: true });

    // travel would be negative; dividing by it would invert the whole reveal.
    expect(renderChrome().style.opacity).toBe('1');
  });
});

describe('fixed positioning and stacking survive the fade', () => {
  it('never applies a property that would make it a containing block', () => {
    mountHero();
    const el = renderChrome();
    scrollTo(600); // mid-fade, where the wrapper is a stacking context

    // transform / filter / perspective / will-change on this wrapper would
    // re-anchor every `position: fixed` child to it, scattering the chrome
    // down the page. Opacity is the only safe way to fade it.
    const style = el.getAttribute('style') ?? '';
    expect(style).not.toMatch(/transform|filter|perspective|will-change/);
    expect(el.className).not.toMatch(/transform|blur|will-change/);
  });

  it('carries an explicit z-index so the fade cannot drop it behind content', () => {
    mountHero();
    expect(renderChrome().className).toMatch(/\bz-50\b/);
  });
});
