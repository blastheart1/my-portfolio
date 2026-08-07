'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useScrollY } from '@/contexts/ScrollContext';

/**
 * Blur-and-focus scroll effect.
 *
 * Whichever item is nearest the vertical centre of the viewport is sharp and
 * fully opaque; everything else blurs and fades in proportion to its distance
 * from that centre. Scrolling moves the focus down the list.
 *
 * Blur, opacity and scale are written directly onto each element's style from
 * a single scroll subscription — no React render per frame. Only the *index*
 * of the focused item is state, and that changes a handful of times over the
 * whole list rather than on every scroll event, so consumers can expand the
 * focused entry without paying for it.
 *
 * `filter: blur()` is expensive to composite, so this is deliberately capped
 * low (MAX_BLUR) and skipped entirely under prefers-reduced-motion — where a
 * page that blurs as you scroll is exactly the wrong thing to do.
 */

const MAX_BLUR = 4;        // px at the far edge of the focus window
const MIN_OPACITY = 0.25;
const MIN_SCALE = 0.94;

/** How far from centre, as a fraction of viewport height, before full blur. */
const FALLOFF = 0.42;

export interface ScrollFocusResult {
  /** Attach to each item, in order. */
  register: (index: number) => (el: HTMLElement | null) => void;
  /** Index nearest the viewport centre, or null before first measure. */
  focusedIndex: number | null;
}

export function useScrollFocus(itemCount: number): ScrollFocusResult {
  const { subscribe } = useScrollY();
  const elements = useRef<(HTMLElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const focusedRef = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(q.matches);
    const on = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);

  const register = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      elements.current[index] = el;
    },
    []
  );

  useEffect(() => {
    if (reducedMotion) {
      // Everything sharp; focus the first item so the expanded state is stable.
      elements.current.forEach(el => {
        if (!el) return;
        el.style.filter = '';
        el.style.opacity = '';
        el.style.transform = '';
      });
      setFocusedIndex(0);
      return;
    }

    const apply = () => {
      const centre = window.innerHeight / 2;
      const falloff = window.innerHeight * FALLOFF;

      let nearest = 0;
      let nearestDistance = Infinity;

      elements.current.forEach((el, i) => {
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const itemCentre = rect.top + rect.height / 2;
        const distance = Math.abs(itemCentre - centre);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = i;
        }

        // 0 at dead centre, 1 at the edge of the focus window.
        const t = Math.min(1, distance / falloff);
        // Ease so items stay readable through the middle and fall off sharply
        // at the edges, rather than everything sitting half-blurred.
        const eased = t * t;

        el.style.filter = eased < 0.01 ? 'none' : `blur(${(eased * MAX_BLUR).toFixed(2)}px)`;
        el.style.opacity = String(1 - eased * (1 - MIN_OPACITY));
        el.style.transform = `scale(${1 - eased * (1 - MIN_SCALE)})`;
      });

      // Only touch state when the focused item actually changes.
      if (nearest !== focusedRef.current) {
        focusedRef.current = nearest;
        setFocusedIndex(nearest);
      }
    };

    apply();
    return subscribe(apply);
  }, [subscribe, itemCount, reducedMotion]);

  return { register, focusedIndex };
}
