'use client';

import * as React from 'react';

import { useScrollY } from '@/contexts/ScrollContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Fades the floating site chrome in as the cosmic hero finishes resolving.
 *
 * The hero is a full-bleed scroll scene, and a nav pill, a theme switch and a
 * chat launcher sitting on top of it fight the image for attention. They only
 * become useful once the portfolio content starts, so that is when they
 * arrive.
 *
 * Only opacity is animated. A transform or a filter on this wrapper would make
 * it a containing block for its `position: fixed` children, which would drop
 * every one of them out of viewport-anchored positioning — the reason this
 * fades rather than slides.
 *
 * Opacity is written straight to the node from the shared scroll subscription
 * rather than through state, so scrolling past the hero costs no React
 * renders. The interactivity flags flip only when crossing the threshold.
 */

/** Fraction of the hero's scroll travel at which the chrome starts appearing. */
const REVEAL_START = 0.88;
/** Extra travel, in viewport heights past the hero, before it is fully in. */
const REVEAL_TRAIL_VH = 0.25;
/** Below this the chrome is treated as absent: no pointer target, no tab stop. */
const INTERACTIVE_AT = 0.05;

export default function ChromeReveal({
  /**
   * Whether this page is expected to render the hero. Drives the very first
   * paint, before any measurement is possible, so the chrome is not visible
   * for a frame and then yanked away. Corrected on mount if the hero turns
   * out not to be there (it can be toggled off from the admin).
   */
  expectHero,
  children,
}: {
  expectHero: boolean;
  children: React.ReactNode;
}) {
  const { subscribe, getScrollY } = useScrollY();
  const reducedMotion = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /** Applies a 0..1 reveal value, touching layout-affecting props only on change. */
    let interactive: boolean | null = null;
    const apply = (v: number) => {
      el.style.opacity = String(v);

      const next = v > INTERACTIVE_AT;
      if (next === interactive) return;
      interactive = next;

      // While invisible the chrome must not be clickable or focusable, or a
      // Tab press lands on controls the visitor cannot see.
      el.style.pointerEvents = next ? '' : 'none';
      el.style.visibility = next ? '' : 'hidden';
      if (next) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    };

    const hero = document.querySelector<HTMLElement>('[data-hero-scene]');

    // No hero to wait for, or the animation is suppressed anyway: the chrome
    // is simply present. Under reduced motion the hero never advances, so a
    // scroll-gated reveal would leave these controls permanently unreachable.
    if (!hero || reducedMotion) {
      apply(1);
      return;
    }

    // Geometry is cached rather than measured per frame, and recomputed when
    // the scene resizes. Measured at zero height under the splash screen it
    // would otherwise collapse the whole reveal into a single pixel.
    let start = 0;
    let end = 1;
    let ready = false;

    const measure = () => {
      const top = hero.offsetTop;
      const travel = hero.offsetHeight - window.innerHeight;
      if (travel <= 0) {
        ready = false;
        apply(1); // Hero shorter than the viewport: nothing to reveal against.
        return;
      }
      ready = true;
      start = top + travel * REVEAL_START;
      end = top + travel + window.innerHeight * REVEAL_TRAIL_VH;
      update(getScrollY());
    };

    const update = (scrollY: number) => {
      if (!ready) return;
      const v = (scrollY - start) / (end - start);
      apply(v < 0 ? 0 : v > 1 ? 1 : v);
    };

    apply(0);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    window.addEventListener('resize', measure);
    const unsubscribe = subscribe(update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      unsubscribe();
    };
  }, [subscribe, getScrollY, reducedMotion]);

  return (
    <div
      ref={ref}
      // z-50 matches the highest z-index the wrapped controls previously
      // carried. Mid-fade the wrapper has 0 < opacity < 1, which makes it a
      // stacking context; without an explicit z-index this subtree would fall
      // to auto and, sitting before {children} in the tree, paint *behind* the
      // page content for the duration of the fade.
      //
      // `relative` is only here to make z-index apply. Unlike transform or
      // filter it does not become a containing block for fixed descendants,
      // so the chrome stays anchored to the viewport.
      className="relative z-50"
      // The inline opacity is the pre-hydration state. Anything that is not a
      // hero page renders visible so the chrome never depends on JS running.
      style={expectHero ? { opacity: 0, visibility: 'hidden' } : undefined}
      aria-hidden={expectHero || undefined}
    >
      {children}
    </div>
  );
}
