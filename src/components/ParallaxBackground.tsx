'use client';

import React, { useEffect, useState } from 'react';
import './parallax.css';

interface Star {
  id: number;
  size: number;
  x: number; // in vw
  y: number; // resting y in vh
  opacity: number;
  layer: number; // for parallax effect
}

const NUM_STARS = 350;

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

export default function ParallaxBackground() {
  const [stars, setStars] = useState<Star[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [smoothScrollY, setSmoothScrollY] = useState(0);

  // Client-side only
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  // Direct scroll effect for immediate response
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    // Use both scroll and wheel events to ensure parallax works
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Force parallax update when splash completes
  useEffect(() => {
    const handleSplashComplete = () => {
      // Force a scroll update to trigger parallax
      setScrollY(window.scrollY);
      setSmoothScrollY(window.scrollY);
      
      // Clear any splash-related scroll blocking with more aggressive approach
      setTimeout(() => {
        // Remove splash classes first
        document.body.classList.remove('splash-active');
        document.documentElement.classList.remove('splash-active');
        
        // Force remove all splash-related styles with !important overrides
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
        document.body.style.setProperty('position', 'static', 'important');
        document.documentElement.style.setProperty('position', 'static', 'important');
        document.body.style.setProperty('touch-action', 'auto', 'important');
        document.documentElement.style.setProperty('touch-action', 'auto', 'important');
        document.body.style.setProperty('height', 'auto', 'important');
        document.documentElement.style.setProperty('height', 'auto', 'important');
        document.body.style.setProperty('width', 'auto', 'important');
        document.documentElement.style.setProperty('width', 'auto', 'important');
        
        // Force scroll restoration
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.documentElement.style.removeProperty('position');
        document.body.style.removeProperty('touch-action');
        document.documentElement.style.removeProperty('touch-action');
        
        // Force a scroll event to ensure parallax works
        window.dispatchEvent(new Event('scroll'));
        
        // Additional scroll restoration for mobile
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            document.body.style.setProperty('overflow', 'auto', 'important');
            document.documentElement.style.setProperty('overflow', 'auto', 'important');
            window.scrollTo(0, window.scrollY);
          }, 50);
        }
      }, 100);
    };

    // Listen for custom splash completion event
    window.addEventListener('splash-complete', handleSplashComplete);
    
    // Fallback: Check if splash is still active after 3 seconds
    const fallbackTimer = setTimeout(() => {
      if (document.body.classList.contains('splash-active') || 
          document.documentElement.classList.contains('splash-active')) {
        console.log('Splash fallback: Forcing scroll restoration');
        handleSplashComplete();
      }
    }, 3000);
    
    return () => {
      window.removeEventListener('splash-complete', handleSplashComplete);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Smooth inertia-based star movement
  useEffect(() => {
    let animationFrame: number;
    let lastUpdate = 0;
    
    const smoothUpdate = (timestamp: number) => {
      // Throttle to 60fps to prevent micro-movements
      if (timestamp - lastUpdate < 16) {
        animationFrame = requestAnimationFrame(smoothUpdate);
        return;
      }
      
      setSmoothScrollY(prev => {
        const diff = scrollY - prev;
        
        // Stop updating if difference is very small to prevent micro-movements
        if (Math.abs(diff) < 0.1) {
          return scrollY;
        }
        
        // More responsive smooth factor for immediate movement (no mobile delay)
        const smoothFactor = 0.4;
        const newValue = prev + diff * smoothFactor;
        
        // Ensure we don't overshoot
        if (Math.abs(newValue - scrollY) < 0.05) {
          return scrollY;
        }
        
        return newValue;
      });
      
      lastUpdate = timestamp;
      animationFrame = requestAnimationFrame(smoothUpdate);
    };
    
    animationFrame = requestAnimationFrame(smoothUpdate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [scrollY]);

  // Generate stars with different layers for parallax (stable generation)
  useEffect(() => {
    const generatedStars: Star[] = [];
    // Use a fixed large height to prevent regeneration during scroll
    const documentHeightVh = 800; // Fixed height to prevent regeneration
    
    for (let i = 0; i < NUM_STARS; i++) {
      const layer = Math.floor(Math.random() * 4); // 0, 1, 2, or 3 for different parallax layers
      generatedStars.push({
        id: i,
        size: randomBetween(0.5, 3),
        x: randomBetween(0, 100),
        y: randomBetween(0, documentHeightVh), // Cover full document height
        opacity: randomBetween(0.3, 0.9),
        layer,
      });
    }
    setStars(generatedStars);
  }, []);

  if (!mounted) return null; // render nothing on server

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className={`parallax-background absolute inset-0 transition-colors duration-1000 ease-out ${
          isDark
            ? "bg-gradient-to-b from-black via-gray-900 to-gray-800"
            : "bg-gradient-to-b from-white via-gray-100 to-gray-200"
        }`}
        style={{
          // Prevent flickering during scroll
          willChange: 'background-color',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      />

      {stars.map((star) => {
        // Parallax with different speeds for each layer (reversed direction)
        const parallaxSpeeds = [0.1, 0.3, 0.5, 0.7]; // Different speeds for depth effect
        const parallaxOffset = -smoothScrollY * parallaxSpeeds[star.layer]; // Use smooth scroll for inertia effect
        
        return (
          <div
            key={star.id}
            className={`absolute rounded-full ${isDark ? "bg-white" : "bg-black"}`}
            style={{
              width: star.size,
              height: star.size,
              left: `${star.x}vw`,
              top: `${star.y}vh`,
              opacity: star.opacity,
              boxShadow: `0 0 ${star.size * 2}px ${isDark ? "white" : "black"}`,
              zIndex: star.layer,
              // Pure CSS transform for smooth 60fps parallax
              transform: `translateY(${parallaxOffset}px) translateZ(0)`,
              willChange: 'transform',
              // Prevent regeneration during scroll
              position: 'absolute',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />
        );
      })}
    </div>
  );
}