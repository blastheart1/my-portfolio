'use client';

import { useEffect, useState } from 'react';

/**
 * True below Tailwind's `md` breakpoint.
 *
 * A media query in JS rather than CSS because the flow canvas has to change
 * shape, not just style: portrait stacks the nodes and moves their connection
 * handles to the top and bottom edges, which is a different graph rather than
 * a different stylesheet.
 *
 * Starts false and corrects after mount, so the server render and the first
 * client render agree. Landscape is the safer initial guess: it is what the
 * desktop majority gets, and a brief reflow on a phone beats a hydration
 * mismatch on every visit.
 */
export function useIsNarrow(query = '(max-width: 767px)'): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setNarrow(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return narrow;
}
