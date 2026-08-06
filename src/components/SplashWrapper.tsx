'use client';

import { useState, useEffect, useRef } from 'react';
import SplashScreen from './SplashScreen';

interface SplashWrapperProps {
  children: React.ReactNode;
  splashEnabled?: boolean;
  splashVersion?: number;
}

export default function SplashWrapper({ children, splashEnabled = true, splashVersion = 1 }: SplashWrapperProps) {
  const [showSplash, setShowSplash]       = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);
  const portfolioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!splashEnabled) {
      // Splash disabled via admin — skip immediately
      setSplashComplete(true);
      return;
    }

    const key = `hasSeenSplash_v${splashVersion}`;
    const hasSeenSplash = localStorage.getItem(key);
    if (hasSeenSplash === 'true') {
      setSplashComplete(true);
      return;
    }

    setShowSplash(true);

    return () => {
      document.body.classList.remove('splash-active');
      document.documentElement.classList.remove('splash-active');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [splashEnabled]);

  /**
   * Restore scrolling once the splash is done.
   *
   * These MUST clear the inline styles rather than set `overflow: auto`.
   * `overflow: auto` on <html> or <body> makes that element the scroll
   * container instead of the viewport, which silently breaks
   * `position: sticky` for every descendant — the sticky hero simply scrolled
   * away with the page instead of pinning.
   */
  useEffect(() => {
    if (splashComplete && !showSplash) {
      document.body.classList.remove('splash-active');
      document.documentElement.classList.remove('splash-active');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.height = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.documentElement.style.overflow = '';
      window.dispatchEvent(new Event('scroll'));
    }
  }, [splashComplete, showSplash]);

  const handleSplashComplete = () => {
    setSplashComplete(true);
    const key = `hasSeenSplash_v${splashVersion}`;
    localStorage.setItem(key, 'true');

    document.body.classList.remove('splash-active');
    document.documentElement.classList.remove('splash-active');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.documentElement.style.overflow = '';
    window.dispatchEvent(new Event('scroll'));

    setTimeout(() => setShowSplash(false), 100);
  };

  return (
    <div className="relative">
      {showSplash && (
        <>
          <SplashScreen onComplete={handleSplashComplete} />
          <div
            className="fixed inset-0 z-[9998] bg-transparent"
            onTouchStart={e => e.preventDefault()}
            onTouchMove={e => e.preventDefault()}
            onTouchEnd={e => e.preventDefault()}
            style={{ touchAction: 'none' }}
          />
        </>
      )}

      <div
        ref={portfolioRef}
        className={`transition-opacity duration-500 ease-out ${splashComplete ? 'opacity-100' : 'opacity-0'}`}
        style={{ position: 'relative', zIndex: splashComplete ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
