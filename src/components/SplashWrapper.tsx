'use client';

import { useState, useEffect, useRef } from 'react';
import SplashScreen from './SplashScreen';

interface SplashWrapperProps {
  children: React.ReactNode;
}

export default function SplashWrapper({ children }: SplashWrapperProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);
  // Removed showOverlay as it's not used in current implementation
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
        
        // Force touch-action reset for mobile
        document.body.style.touchAction = '';
        document.documentElement.style.touchAction = '';
        
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup function if needed
    };
  }, []);

  const handleSplashComplete = () => {
    console.log('SplashWrapper: handleSplashComplete called');
    setSplashComplete(true);
    localStorage.setItem('hasSeenSplash', 'true');
    
    // Prevent Framer Motion from restarting by setting a flag
    if (typeof window !== 'undefined') {
      (window as Window & { portfolioTransitionComplete?: boolean }).portfolioTransitionComplete = true;
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
      
      // Force touch-action reset for mobile
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      
      // Force scroll events to restore parallax with proper timing
      setTimeout(() => {
        // Reset scroll position to top
        window.scrollTo(0, 0);
        
        // Trigger multiple scroll events to ensure parallax updates
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('wheel'));
        window.dispatchEvent(new Event('touchmove'));
        
        // Trigger parallax update
        window.dispatchEvent(new CustomEvent('splash-complete'));
        
        // Additional parallax trigger after a short delay
        setTimeout(() => {
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new CustomEvent('splash-complete'));
        }, 100);
      }, 50);
      
      console.log('Scroll functionality restored');
    };
    
    // Restore scroll immediately
    restoreScroll();
    
    // Dispatch custom event for parallax
    window.dispatchEvent(new CustomEvent('splash-complete'));
    
    // Force parallax to update with current scroll position
    setTimeout(() => {
      // Direct scroll position update for parallax
      const parallaxEvent = new CustomEvent('scroll', { 
        detail: { scrollY: window.scrollY } 
      });
      window.dispatchEvent(parallaxEvent);
      
      // Also dispatch a regular scroll event
      window.dispatchEvent(new Event('scroll'));
    }, 25);
    
    // Additional scroll restoration attempts
    setTimeout(restoreScroll, 100);
    setTimeout(restoreScroll, 500);
    
    // Mobile-specific scroll restoration
    if (window.innerWidth <= 768) {
      // Immediate mobile scroll restoration
      document.body.style.touchAction = 'auto';
      document.documentElement.style.touchAction = 'auto';
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      
      // Remove any remaining touch event listeners
      const removeAllTouchListeners = () => {
        const events = ['touchstart', 'touchmove', 'touchend'];
        events.forEach(event => {
          document.removeEventListener(event, () => {}, { passive: false });
          document.removeEventListener(event, () => {}, { passive: true });
          document.removeEventListener(event, () => {}, { capture: true });
          document.removeEventListener(event, () => {}, { capture: false });
        });
      };
      
      removeAllTouchListeners();
      
      setTimeout(() => {
        // Force mobile scroll restoration
        document.body.style.touchAction = 'auto';
        document.documentElement.style.touchAction = 'auto';
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        
        // Trigger a scroll event to activate mobile scrolling
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
        
        // Force enable touch scrolling
        document.body.style.pointerEvents = 'auto';
        document.documentElement.style.pointerEvents = 'auto';
        
        console.log('Mobile scroll restoration completed');
      }, 100);
    }
    
    // Smooth scroll transition - hide splash after scroll animation completes
    setTimeout(() => {
      console.log('Hiding splash screen after scroll animation');
      setShowSplash(false);
      
      // Final scroll restoration and position reset
      restoreScroll();
      
      // Ensure scroll position is at top when portfolio appears
      window.scrollTo(0, 0);
      
      // Force parallax update after position reset
      setTimeout(() => {
        // Reset scroll position to ensure parallax starts from top
        window.scrollTo(0, 0);
        
        // Trigger parallax events
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('wheel'));
        window.dispatchEvent(new CustomEvent('splash-complete'));
        
        // Force a small scroll to trigger parallax
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
        
        // Additional parallax trigger
        setTimeout(() => {
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new CustomEvent('splash-complete'));
        }, 50);
      }, 100);
    }, 1000); // Match the scroll-out duration from splash screen
  };

  return (
    <div className="relative">
      {showSplash && (
        <>
          <SplashScreen onComplete={handleSplashComplete} />
          {/* Scroll-blocking overlay to prevent portfolio scroll during splash */}
          <div 
            className="fixed inset-0 z-[9998] bg-transparent"
            onScroll={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onTouchEnd={(e) => e.preventDefault()}
            style={{ 
              touchAction: 'none',
              pointerEvents: 'auto'
            }}
          />
        </>
      )}
      
      {/* No overlay needed for scroll-based transition */}
      
      <div 
        ref={portfolioRef}
        key="portfolio-content"
        className={`portfolio-content ${
          splashComplete ? 'scroll-in' : 'scroll-out'
        }`}
        style={{
          position: 'relative',
          zIndex: splashComplete ? 1 : 0,
          touchAction: 'auto',
          overflow: 'auto'
        }}
        onTouchStart={() => {
          // Force mobile scroll activation on touch
          document.body.style.touchAction = 'auto';
          document.documentElement.style.touchAction = 'auto';
        }}
      >
        {children}
      </div>
      
      <style jsx>{`
        @keyframes scrollOut {
          from { transform: translateY(0); }
          to { transform: translateY(-100%); }
        }
        
        @keyframes scrollIn {
          from { 
            transform: translateY(100vh); 
          }
          to { 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
}
