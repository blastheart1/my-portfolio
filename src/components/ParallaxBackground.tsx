'use client';

import React, { useEffect, useState, useRef } from 'react';
import './parallax.css';
import { useScrollY } from '@/contexts/ScrollContext';

interface Star {
  id: number;
  size: number;
  x: number;
  y: number;
  opacity: number;
  layer: number;
}

const NUM_STARS = 120;
const PARALLAX_SPEEDS = [0.1, 0.3, 0.5, 0.7];

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

export default function ParallaxBackground() {
  const [stars, setStars] = useState<Star[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const layerRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const { subscribe } = useScrollY();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  // Apply parallax via direct DOM manipulation — no React re-renders on scroll
  useEffect(() => {
    const unsubscribe = subscribe((scrollY) => {
      PARALLAX_SPEEDS.forEach((speed, i) => {
        const el = layerRefs[i].current;
        if (el) el.style.transform = `translateY(${-scrollY * speed}px)`;
      });
    });
    return unsubscribe;
  }, [subscribe]);

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Generate stars grouped by layer
  useEffect(() => {
    const generatedStars: Star[] = [];
    for (let i = 0; i < NUM_STARS; i++) {
      const layer = Math.floor(Math.random() * 4);
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

  if (!mounted) return null;

  const starsByLayer = [0, 1, 2, 3].map(layer =>
    stars.filter(s => s.layer === layer)
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className={`absolute inset-0 transition-colors duration-700 ${
          isDark
            ? 'bg-gradient-to-b from-black via-gray-900 to-gray-800'
            : 'bg-gradient-to-b from-white via-gray-100 to-gray-200'
        }`}
      />

      {starsByLayer.map((layerStars, layerIndex) => (
        <div
          key={layerIndex}
          ref={layerRefs[layerIndex]}
          className="absolute inset-0"
          style={{
            zIndex: layerIndex,
            willChange: 'transform',
          }}
        >
          {layerStars.map((star) => (
            <div
              key={star.id}
              className={`absolute rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}
              style={{
                width: star.size,
                height: star.size,
                left: `${star.x}vw`,
                top: `${star.y}vh`,
                opacity: star.opacity,
                boxShadow: `0 0 ${star.size * 2}px ${isDark ? 'white' : 'black'}`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
