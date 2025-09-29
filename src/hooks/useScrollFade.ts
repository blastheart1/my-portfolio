import { useState, useEffect } from 'react';

interface UseScrollFadeOptions {
  threshold?: number; // Scroll threshold in pixels
  fadeOut?: boolean; // Whether to fade out on scroll
}

export function useScrollFade(options: UseScrollFadeOptions = {}) {
  const { threshold = 100, fadeOut = true } = options;
  const [isScrolled, setIsScrolled] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldFade = scrollY > threshold;
      
      setIsScrolled(shouldFade);
      
      if (fadeOut) {
        // Calculate opacity based on scroll position
        // Fade starts at threshold and becomes fully transparent at threshold + 200px
        const fadeStart = threshold;
        const fadeEnd = threshold + 200;
        const scrollProgress = Math.min((scrollY - fadeStart) / (fadeEnd - fadeStart), 1);
        const newOpacity = Math.max(0, 1 - scrollProgress);
        setOpacity(newOpacity);
      } else {
        setOpacity(1);
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, fadeOut]);

  return {
    isScrolled,
    opacity,
    isVisible: opacity > 0
  };
}
