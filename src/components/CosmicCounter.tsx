'use client';

import * as React from 'react';

import { useScrollY } from '@/contexts/ScrollContext';

/**
 * A large statistic whose glyphs are filled with a starfield, with a sparkle
 * and a dashed trail drifting alongside.
 *
 * The starfield is generated procedurally as CSS radial-gradients rather than
 * shipped as an image: no asset to download, it scales to any size without
 * blurring, and it recolours with the theme.
 *
 * IMPORTANT: star positions come from a seeded generator, never Math.random().
 * Random values would differ between the server and client renders and produce
 * a hydration mismatch.
 */

interface CosmicCounterProps {
  /** Final value to count to. */
  value: number;
  /** Sits under the number. */
  caption?: string;
  /** Rendered after the number, e.g. "+" or "k". */
  suffix?: string;
  /** Changes the starfield without changing anything else. */
  seed?: number;
  className?: string;
}

/**
 * Mulberry32 — small, fast, deterministic. Same seed always yields the same
 * field, which is what keeps SSR and hydration in agreement.
 */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

function generateStars(count: number, seed: number): Star[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    // Mostly small with a few brighter ones — an even distribution reads as
    // noise rather than a sky.
    size: 0.5 + rand() * rand() * 2.5,
    opacity: 0.35 + rand() * 0.65,
  }));
}

/** Stars as a single CSS background-image value. */
function starfieldCss(stars: Star[]): string {
  return stars
    .map(
      s =>
        `radial-gradient(${s.size}px ${s.size}px at ${s.x.toFixed(2)}% ${s.y.toFixed(2)}%, ` +
        `rgba(255,255,255,${s.opacity.toFixed(2)}) 0%, rgba(255,255,255,0) 100%)`
    )
    .join(', ');
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export default function CosmicCounter({
  value,
  caption,
  suffix = '',
  seed = 1,
  className,
}: CosmicCounterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { subscribe } = useScrollY();

  const rootRef = React.useRef<HTMLDivElement>(null);
  const sparkleRef = React.useRef<HTMLDivElement>(null);
  const [displayed, setDisplayed] = React.useState(0);
  const [inView, setInView] = React.useState(false);

  const stars = React.useMemo(() => generateStars(60, seed), [seed]);
  const starfield = React.useMemo(() => starfieldCss(stars), [stars]);

  // Count up once, when the number first scrolls into view.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!inView) return;

    // Reduced motion still gets the number — just not the animation.
    if (reducedMotion) {
      setDisplayed(value);
      return;
    }

    const DURATION = 1400;
    let frame = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      // easeOutCubic — fast then settling, which reads as "counting up".
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, reducedMotion]);

  // Drift the sparkle with scroll. Writes transform on a ref rather than
  // setting state, so scrolling never triggers a React render — the same
  // pattern ParallaxBackground uses.
  React.useEffect(() => {
    if (reducedMotion) return;

    return subscribe(scrollY => {
      const el = sparkleRef.current;
      if (!el) return;
      const offset = (scrollY % 400) / 400;
      el.style.transform = `translate3d(0, ${offset * 18 - 9}px, 0)`;
    });
  }, [subscribe, reducedMotion]);

  return (
    <div ref={rootRef} className={className}>
      <div className="relative inline-flex items-start gap-4">
        <Sparkle ref={sparkleRef} animate={!reducedMotion} />

        <p
          // The animated digits would otherwise be announced on every frame.
          aria-label={`${value.toLocaleString()}${suffix}`}
          className="cosmic-counter-number select-none text-[clamp(4rem,14vw,11rem)] font-bold leading-none tracking-tight"
          style={{
            backgroundImage: `${starfield}, linear-gradient(160deg, #14202b 0%, #0b1016 60%, #1b2733 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <span aria-hidden="true">
            {displayed.toLocaleString()}
            {suffix}
          </span>
        </p>
      </div>

      {caption && (
        <p className="mt-4 max-w-md font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}

/**
 * Four-point sparkle with a dashed trail.
 *
 * Decorative: aria-hidden, and the trail is drawn once rather than looping so
 * it does not pull the eye away from the content it decorates.
 */
const Sparkle = React.forwardRef<HTMLDivElement, { animate: boolean }>(
  function Sparkle({ animate }, ref) {
    return (
      <div ref={ref} aria-hidden="true" className="pointer-events-none mt-6 shrink-0">
        <svg width="120" height="240" viewBox="0 0 120 240" fill="none">
          <path
            d="M42 44 C 38 110, 60 170, 96 232"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="4 6"
            className={animate ? 'cosmic-trail' : undefined}
          />
          <g className={animate ? 'cosmic-sparkle' : undefined} style={{ transformOrigin: '42px 44px' }}>
            <path
              d="M42 18 L46 40 L68 44 L46 48 L42 70 L38 48 L16 44 L38 40 Z"
              fill="var(--color-brand, #d7f24a)"
            />
          </g>
        </svg>
      </div>
    );
  }
);
