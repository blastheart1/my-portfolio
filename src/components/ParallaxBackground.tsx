'use client';

import { useEffect, useRef, useState } from 'react';
import './parallax.css';

export default function ParallaxBackground() {
  const starLayers = useRef<HTMLDivElement[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-side only
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      starLayers.current.forEach((layer, index) => {
        const speed = 0.1 + index * 0.2;
        layer.style.transform = `translateY(${-scrollY * speed}px)`;
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const createStars = (count: number) =>
    Array.from({ length: count }).map(() => {
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const size = Math.random() * 4 + 1;
      const opacity = Math.random() * 0.5 + 0.5;

      return (
        <div
          key={Math.random()}
          className="star"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            opacity,
            backgroundColor: isDark ? 'white' : 'black',
          }}
        />
      );
    });

  if (!mounted) return null; // render nothing on server

  return (
    <>
      <div
        className="stars-layer fixed inset-0 -z-10"
        ref={(el) => {
          if (el) starLayers.current[0] = el;
        }}
      >
        {createStars(50)}
      </div>
      <div
        className="stars-layer fixed inset-0 -z-10"
        ref={(el) => {
          if (el) starLayers.current[1] = el;
        }}
      >
        {createStars(30)}
      </div>
      <div
        className="stars-layer fixed inset-0 -z-10"
        ref={(el) => {
          if (el) starLayers.current[2] = el;
        }}
      >
        {createStars(20)}
      </div>
    </>
  );
}
