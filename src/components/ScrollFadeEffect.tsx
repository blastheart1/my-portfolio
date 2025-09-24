"use client";

import { useEffect, useState, useRef } from "react";

interface ScrollFadeEffectProps {
  children: React.ReactNode;
  className?: string;
  fadeStartPoint?: number; // Percentage of page scroll to start fading (0-1)
  fadeIntensity?: number; // How aggressively to fade (1-3)
  disableFade?: boolean; // Option to disable fade for specific sections
}

export default function ScrollFadeEffect({ 
  children, 
  className = "",
  fadeStartPoint = 0.75,
  fadeIntensity = 1.5,
  disableFade = false
}: ScrollFadeEffectProps) {
  const [opacity, setOpacity] = useState(1);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disableFade) {
      setOpacity(1);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Calculate how far we've scrolled as a percentage
      const scrollPercentage = scrollTop / (documentHeight - windowHeight);
      
      let newOpacity = 1;
      
      // Only apply fade effect when we're actually near the bottom
      if (scrollPercentage > fadeStartPoint) {
        // Fade out when scrolling down past the start point
        const fadeProgress = (scrollPercentage - fadeStartPoint) / (1 - fadeStartPoint);
        newOpacity = Math.max(0, 1 - (fadeProgress * fadeIntensity));
      } else {
        // When not at the fade start point, always show full opacity
        // Only apply fade-in logic when we're very close to the bottom
        if (scrollPercentage > fadeStartPoint * 0.8) {
          // Much more sensitive fade-in when scrolling up from near bottom
          const fadeInProgress = Math.pow(scrollPercentage / fadeStartPoint, 0.3);
          newOpacity = Math.min(1, fadeInProgress);
          
          // Add extra sensitivity for scroll movements near the bottom
          if (scrollPercentage > fadeStartPoint * 0.9) {
            newOpacity = Math.max(newOpacity, 0.7);
          } else if (scrollPercentage > fadeStartPoint * 0.7) {
            newOpacity = Math.max(newOpacity, 0.4);
          }
        } else {
          // When far from bottom, always show full opacity
          newOpacity = 1;
        }
      }
      
      setOpacity(newOpacity);
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [fadeStartPoint, fadeIntensity, disableFade]);

  return (
    <div 
      ref={elementRef}
      className={`transition-opacity duration-500 ease-out ${className}`}
      style={{ 
        opacity,
        pointerEvents: opacity < 0.1 ? 'none' : 'auto'
      }}
    >
      {children}
    </div>
  );
}
