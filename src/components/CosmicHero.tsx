'use client';

import * as React from 'react';
import Image from 'next/image';

import { useScrollY } from '@/contexts/ScrollContext';
import { SPACE_IMAGES } from '@/lib/space-assets';
import { cn } from '@/lib/utils';

/**
 * Scroll-driven space hero.
 *
 * A tall scroll container with a sticky viewport inside. As you scroll: the
 * sky lifts from deep space toward daylight, the astronaut sinks and is
 * gradually swallowed by cloud layers rising at six different depths, and the
 * whole scene dissolves to white — handing off to the rest of the page.
 *
 * Two things that took iterating on:
 *
 * 1. The cloud PNGs are rectangles. Simply moving them up leaves a visible
 *    straight edge across the viewport. Each layer is therefore masked with a
 *    vertical gradient so its bottom fades out, and a white gradient sits
 *    beneath everything so the layers dissolve into the next section rather
 *    than stopping.
 *
 * 2. The astronaut's idle bob and its scroll-driven descent both animate
 *    `transform`. They live on nested elements — outer for scroll, inner for
 *    the CSS keyframe — because on one element each would overwrite the other
 *    every frame.
 *
 * Everything scroll-driven runs off a single ScrollContext subscription
 * writing to refs: no per-frame React renders, only compositable properties,
 * and geometry measured on resize rather than inside the scroll handler.
 */

/** Total scroll distance for the sequence, in vh. Longer = slower, calmer. */
const SCENE_VH = 420;

interface CosmicHeroProps {
  name?: string;
  tagline?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(q.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return reduced;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Map v from [a,b] onto [0,1], clamped. */
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

/**
 * Cloud layers, far to near.
 *
 * `start`/`end` are the scroll-progress window over which the layer travels;
 * staggering them is what makes the bank build up rather than arrive as one
 * slab. `rise` is how far it moves, in vh.
 */
const CLOUD_LAYERS = [
  { image: SPACE_IMAGES.cloudWhite,  start: 0.00, end: 0.70, rise: 50, className: 'bottom-[2%]   left-[-18%] w-[80%]  opacity-40 blur-[3px]' },
  { image: SPACE_IMAGES.cloudTwo,    start: 0.04, end: 0.74, rise: 62, className: 'bottom-[-2%]  right-[-20%] w-[88%] opacity-55 blur-[2px]' },
  { image: SPACE_IMAGES.cloudBanner, start: 0.10, end: 0.80, rise: 74, className: 'bottom-[-6%]  left-[-10%] w-[105%] opacity-70 blur-[1px]' },
  { image: SPACE_IMAGES.cloudWhite,  start: 0.18, end: 0.86, rise: 86, className: 'bottom-[-10%] right-[-12%] w-[95%] opacity-85' },
  { image: SPACE_IMAGES.cloudTwo,    start: 0.26, end: 0.92, rise: 98, className: 'bottom-[-16%] left-[-16%] w-[115%] opacity-95' },
  { image: SPACE_IMAGES.cloudBanner, start: 0.34, end: 1.00, rise: 112, className: 'bottom-[-22%] right-[-8%] w-[130%]' },
] as const;

export default function CosmicHero({
  name = 'Antonio Luis Santos',
  tagline = 'AI Full-Stack Software Engineer — building systems that automate, integrate, and scale.',
  ctaLabel,
  onCta,
  className,
}: CosmicHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { subscribe } = useScrollY();

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const skyRef = React.useRef<HTMLDivElement>(null);
  const whiteRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLDivElement>(null);
  const astronautRef = React.useRef<HTMLDivElement>(null);
  const cloudRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const geometry = React.useRef({ top: 0, travel: 1 });

  React.useEffect(() => {
    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      geometry.current = {
        top: rect.top + window.scrollY,
        travel: Math.max(1, el.offsetHeight - window.innerHeight),
      };
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  React.useEffect(() => {
    if (reducedMotion) return;

    return subscribe(scrollY => {
      const { top, travel } = geometry.current;
      const p = clamp01((scrollY - top) / travel);

      // Sky: night fades out, revealing the daylight gradient beneath.
      if (skyRef.current) {
        skyRef.current.style.opacity = String(1 - range(p, 0.10, 0.72));
      }

      // Title: lifts away and fades before the clouds reach it.
      if (titleRef.current) {
        const out = range(p, 0.18, 0.48);
        titleRef.current.style.transform = `translate3d(0, ${-out * 140}px, 0)`;
        titleRef.current.style.opacity = String(1 - out);
      }

      // Astronaut: sinks into the cloud bank while swaying, then fades as the
      // nearest layers pass in front of it.
      if (astronautRef.current) {
        const sink = range(p, 0, 0.9) * 300;
        const sway = Math.sin(p * Math.PI * 1.4) * 46;
        const spin = p * 18 - 6;
        astronautRef.current.style.transform =
          `translate3d(${sway}px, ${sink}px, 0) rotate(${spin}deg)`;
        astronautRef.current.style.opacity = String(1 - range(p, 0.52, 0.78));
      }

      // Clouds: each rises across its own window, so the bank accumulates.
      CLOUD_LAYERS.forEach((layer, i) => {
        const el = cloudRefs.current[i];
        if (!el) return;
        const t = range(p, layer.start, layer.end);
        el.style.transform = `translate3d(0, ${(1 - t) * layer.rise}vh, 0)`;
      });

      // Final dissolve. Starts late and finishes just before the section ends,
      // so the handoff to the page below is a fade rather than a cut.
      if (whiteRef.current) {
        whiteRef.current.style.opacity = String(range(p, 0.78, 0.99));
      }
    });
  }, [subscribe, reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', className)}
      style={{ height: `${SCENE_VH}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Daylight base, revealed as the night sky fades above it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#93b7cb_0%,#c9d9e5_40%,#eef3f7_72%,#ffffff_100%)]"
        />

        {/* Night sky */}
        <div
          ref={skyRef}
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#04080d_0%,#0c2129_42%,#2a565a_78%,#4a7a76_100%)]"
        />

        {/* Title */}
        <div
          ref={titleRef}
          className="absolute inset-x-0 top-[9vh] z-30 px-[5vw] will-change-transform"
        >
          <h1
            className="font-display font-light uppercase leading-[0.86] tracking-[-0.02em]
                       text-[clamp(2.5rem,10.5vw,9.5rem)] text-white
                       [text-wrap:balance] drop-shadow-[0_2px_40px_rgba(0,0,0,0.4)]"
          >
            {name}
          </h1>

          <p
            className="mt-[3.5vh] max-w-xl font-mono-ui text-[clamp(0.62rem,1vw,0.78rem)]
                       uppercase leading-relaxed tracking-[0.16em] text-white/85"
          >
            {tagline}
          </p>

          {onCta && ctaLabel && (
            <button
              type="button"
              onClick={onCta}
              className="mt-[4vh] inline-flex items-center gap-2 rounded-full border border-white/50
                         px-6 py-2.5 font-mono-ui text-[0.7rem] uppercase tracking-[0.14em]
                         text-white transition-colors hover:bg-white/10
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span aria-hidden="true">✦</span>
              {ctaLabel}
            </button>
          )}
        </div>

        {/* Astronaut — outer element takes the scroll transform, inner one the
            idle bob. See the docblock. */}
        <div
          ref={astronautRef}
          className="pointer-events-none absolute left-1/2 top-[34vh] z-20 w-[clamp(10rem,24vw,22rem)]
                     -translate-x-1/2 will-change-transform"
        >
          <div className={reducedMotion ? undefined : 'cosmic-float'}>
            <Image
              src={SPACE_IMAGES.astronaut.src}
              width={SPACE_IMAGES.astronaut.width}
              height={SPACE_IMAGES.astronaut.height}
              alt={SPACE_IMAGES.astronaut.alt}
              priority
              sizes="(max-width: 768px) 50vw, 24vw"
              className="h-auto w-full drop-shadow-[0_30px_70px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* Cloud bank. z-indices interleave around the astronaut (z-20) so the
            later layers genuinely pass in front of it. */}
        {CLOUD_LAYERS.map((layer, i) => (
          <CloudLayer
            key={i}
            ref={el => { cloudRefs.current[i] = el; }}
            image={layer.image}
            className={cn(layer.className, i < 3 ? 'z-10' : 'z-[21]')}
          />
        ))}

        {/* Dissolve into the next section. The cloud art is rectangular, so
            without this its straight bottom edge is visible against the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] h-[38vh]
                     bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.75)_55%,#ffffff_100%)]"
        />

        {/* Final white-out. */}
        <div
          ref={whiteRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[26] bg-white opacity-0"
        />
      </div>
    </div>
  );
}

const CloudLayer = React.forwardRef<
  HTMLDivElement,
  { image: (typeof SPACE_IMAGES)[keyof typeof SPACE_IMAGES]; className?: string }
>(function CloudLayer({ image, className }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none absolute will-change-transform', className)}
      style={{
        // Fade each layer's own bottom edge so the rectangle never reads as a
        // straight line across the viewport.
        maskImage:
          'linear-gradient(180deg, rgba(0,0,0,1) 55%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage:
          'linear-gradient(180deg, rgba(0,0,0,1) 55%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0) 100%)',
      }}
    >
      <Image
        src={image.src}
        width={image.width}
        height={image.height}
        alt=""
        aria-hidden="true"
        sizes="100vw"
        className="h-auto w-full select-none"
      />
    </div>
  );
});
