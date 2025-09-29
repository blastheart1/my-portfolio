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

  // Monitor when portfolio becomes visible and ensure scroll is working
  useEffect(() => {
    if (splashComplete && !showSplash) {
      console.log('Portfolio is visible - ensuring scroll works');
      
      const ensureScrollWorks = () => {
        // Final scroll restoration
        document.body.classList.remove('splash-active');
        document.documentElement.classList.remove('splash-active');
        document.body.style.overflow = 'auto';
        document.body.style.position = '';
        document.body.style.height = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.documentElement.style.overflow = 'auto';
        
        // Trigger parallax
        window.dispatchEvent(new Event('scroll'));
        console.log('Portfolio scroll fully restored');
      };
      
      ensureScrollWorks();
      setTimeout(ensureScrollWorks, 100);
      setTimeout(ensureScrollWorks, 500);
      setTimeout(ensureScrollWorks, 1000);
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
    
    // Aggressively restore scroll functionality
    const restoreScroll = () => {
      // Remove any remaining splash classes
      document.body.classList.remove('splash-active');
      document.documentElement.classList.remove('splash-active');
      
      // Clear any inline styles that might block scroll
      document.body.style.overflow = 'auto';
      document.body.style.position = '';
      document.body.style.height = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.documentElement.style.overflow = 'auto';
      
      // Force scroll events to restore parallax
      window.dispatchEvent(new Event('scroll'));
      console.log('Scroll functionality restored');
    };
    
    // Restore scroll immediately
    restoreScroll();
    
    // Dispatch custom event for parallax
    window.dispatchEvent(new CustomEvent('splash-complete'));
    
    // Additional scroll restoration attempts
    setTimeout(restoreScroll, 100);
    setTimeout(restoreScroll, 500);
    
    // Smooth transition - hide splash immediately
    setTimeout(() => {
      console.log('Hiding splash screen');
      setShowSplash(false);
      // Final scroll restoration
      restoreScroll();
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
