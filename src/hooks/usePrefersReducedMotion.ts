'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks the `prefers-reduced-motion: reduce` media query.
 *
 * Three components had grown byte-identical private copies of this. Extracted
 * on the fourth caller rather than adding another.
 *
 * Starts `false` and corrects after mount: the query cannot be read during a
 * server render, and defaulting to "reduced" would strip the animations from
 * every visitor's first paint.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
