'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

type ScrollCallback = (scrollY: number) => void;

interface ScrollContextValue {
  subscribe: (cb: ScrollCallback) => () => void;
  getScrollY: () => number;
}

const ScrollContext = createContext<ScrollContextValue | null>(null);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollYRef = useRef(0);
  const callbacksRef = useRef<Set<ScrollCallback>>(new Set());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        scrollYRef.current = window.scrollY;
        callbacksRef.current.forEach(cb => cb(scrollYRef.current));
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const subscribe = (cb: ScrollCallback) => {
    callbacksRef.current.add(cb);
    return () => { callbacksRef.current.delete(cb); };
  };

  const getScrollY = () => scrollYRef.current;

  return (
    <ScrollContext.Provider value={{ subscribe, getScrollY }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollY() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error('useScrollY must be used within ScrollProvider');
  return ctx;
}
