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
    };

    // Listen for custom splash completion event
    window.addEventListener('splash-complete', handleSplashComplete);
    
    return () => {
      window.removeEventListener('splash-complete', handleSplashComplete);
    };
  }, []);

  // Generate stars with different layers for parallax
  useEffect(() => {
    const generatedStars: Star[] = [];
    for (let i = 0; i < NUM_STARS; i++) {
      const layer = Math.floor(Math.random() * 4); // 0, 1, 2, or 3 for different parallax layers
      generatedStars.push({
        id: i,
        size: randomBetween(0.5, 3),
        x: randomBetween(0, 100),
        y: randomBetween(10, 90),
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
        className={`absolute inset-0 transition-colors duration-700 ${
          isDark
            ? "bg-gradient-to-b from-black via-gray-900 to-gray-800"
            : "bg-gradient-to-b from-white via-gray-100 to-gray-200"
        }`}
      />

      {stars.map((star) => {
        // Parallax with different speeds for each layer (reversed direction)
        const parallaxSpeeds = [0.1, 0.3, 0.5, 0.7]; // Different speeds for depth effect
        const parallaxOffset = -scrollY * parallaxSpeeds[star.layer]; // Negative for reverse direction
        
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
              transform: `translateY(${parallaxOffset}px)`,
              willChange: 'transform',
            }}
          />
        );
      })}
    </div>
  );
}