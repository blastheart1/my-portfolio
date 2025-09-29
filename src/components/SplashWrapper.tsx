'use client';

import { useState, useEffect, useRef } from 'react';
import SplashScreen from './SplashScreen';

interface SplashWrapperProps {
  children: React.ReactNode;
}

export default function SplashWrapper({ children }: SplashWrapperProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const portfolioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has seen splash before (optional - you can remove this)
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash === 'true') {
      setShowSplash(false);
      setSplashComplete(true);
    }
    
    // Cleanup function to ensure scroll is always restored
    return () => {
      document.body.classList.remove('splash-active');
      document.documentElement.classList.remove('splash-active');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Monitor when portfolio becomes visible and ensure parallax is triggered
  useEffect(() => {
    if (splashComplete && !showSplash) {
      console.log('Portfolio is visible - triggering parallax');
      const triggerParallax = () => {
        window.dispatchEvent(new Event('scroll'));
      };
      
      triggerParallax();
      setTimeout(triggerParallax, 100);
      setTimeout(triggerParallax, 500);
    }
  }, [splashComplete, showSplash]);

  // Cleanup overlay on unmount
  useEffect(() => {
    return () => {
      setShowOverlay(false);
    };
  }, []);

  const handleSplashComplete = () => {
    console.log('SplashWrapper: handleSplashComplete called');
    setSplashComplete(true);
    localStorage.setItem('hasSeenSplash', 'true');
    
    // Prevent Framer Motion from restarting by setting a flag
    if (typeof window !== 'undefined') {
      (window as any).portfolioTransitionComplete = true;
    }
    
    // Dispatch custom event for parallax
    window.dispatchEvent(new CustomEvent('splash-complete'));
    
    // Smooth transition - hide splash immediately
    setTimeout(() => {
      console.log('Hiding splash screen');
      setShowSplash(false);
    }, 100); // Very short delay for smooth transition
  };

  return (
    <div className="relative">
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      
      {/* No overlay - clean transition */}
      
      <div 
        ref={portfolioRef}
        key="portfolio-content"
        className={`transition-opacity duration-500 ease-out ${
          splashComplete ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          position: 'relative',
          zIndex: splashComplete ? 1 : 0
        }}
      >
        {children}
      </div>
      
      <style jsx>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
