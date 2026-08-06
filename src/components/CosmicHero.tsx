'use client';

import * as React from 'react';
import Image from 'next/image';

import { useScrollY } from '@/contexts/ScrollContext';
import { SPACE_IMAGES } from '@/lib/space-assets';
import { cn } from '@/lib/utils';

/**
 * Scroll-driven hero.
 *
 * A tall scroll container with a sticky viewport inside it. As you scroll:
 * the sky lifts from deep space to daylight, the clouds rise and close over
 * the scene, and the whole thing resolves to white — handing off to the rest
 * of the page.
 *
 * Everything is driven from one scroll subscription writing transforms and
 * opacities onto refs. No per-frame React renders, and only compositable
 * properties are touched.
 *
 * The sticky child is what pins the scene; the parent's height is what gives
 * the scroll something to travel through. Changing SCENE_VH changes how long
 * the sequence lasts.
 */

const SCENE_VH = 260; // total scroll distance, in vh

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

/** clamp(0,1) */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Map v from [a,b] onto [0,1], clamped. */
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

export default function CosmicHero({
  name = 'Antonio Luis Santos',
  tagline = 'AI Full-Stack Software Engineer — building systems that automate, integrate, and scale.',
  ctaLabel = 'Schedule a call',
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
  const cloudBackRef = React.useRef<HTMLDivElement>(null);
  const cloudMidRef = React.useRef<HTMLDivElement>(null);
  const cloudFrontRef = React.useRef<HTMLDivElement>(null);

  // Measured once per resize — reading layout inside the scroll handler would
  // force a synchronous reflow every frame.
  const geometry = React.useRef({ top: 0, travel: 1 });

  React.useEffect(() => {
    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      geometry.current = {
        top: rect.top + window.scrollY,
        // The sticky child occupies one viewport; everything beyond it is
        // the distance the scene actually animates over.
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

      // ── Sky: deep space -> dusk -> daylight ──────────────────────────────
      if (skyRef.current) {
        // Lighten by fading the dark gradient out; the daylight gradient sits
        // underneath it.
        skyRef.current.style.opacity = String(1 - range(p, 0.15, 0.75));
      }

      // ── Title: drifts up and fades before the clouds close ───────────────
      if (titleRef.current) {
        const out = range(p, 0.25, 0.55);
        titleRef.current.style.transform = `translate3d(0, ${-out * 120}px, 0)`;
        titleRef.current.style.opacity = String(1 - out);
      }

      // ── Astronaut: rises, drifts, tumbles slowly ─────────────────────────
      if (astronautRef.current) {
        const rise = p * -220;
        const sway = Math.sin(p * Math.PI * 1.6) * 40;
        const spin = p * 26 - 8;
        const fade = 1 - range(p, 0.62, 0.85);
        astronautRef.current.style.transform =
          `translate3d(${sway}px, ${rise}px, 0) rotate(${spin}deg)`;
        astronautRef.current.style.opacity = String(fade);
      }

      // ── Clouds: rise and close over the scene ────────────────────────────
      // Different speeds give depth; the front layer arrives last and is what
      // actually covers the astronaut.
      if (cloudBackRef.current) {
        cloudBackRef.current.style.transform =
          `translate3d(0, ${(1 - range(p, 0, 0.8)) * 55}vh, 0)`;
      }
      if (cloudMidRef.current) {
        cloudMidRef.current.style.transform =
          `translate3d(0, ${(1 - range(p, 0.05, 0.85)) * 75}vh, 0)`;
      }
      if (cloudFrontRef.current) {
        cloudFrontRef.current.style.transform =
          `translate3d(0, ${(1 - range(p, 0.1, 0.95)) * 95}vh, 0)`;
      }

      // ── White-out: the handoff to the rest of the page ───────────────────
      if (whiteRef.current) {
        whiteRef.current.style.opacity = String(range(p, 0.72, 0.97));
      }
    });
  }, [subscribe, reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', className)}
      style={{ height: `${SCENE_VH}vh` }}
    >
      {/* Sticky viewport — this is what stays put while the parent scrolls. */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Daylight base, revealed as the night sky fades out above it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#8fb3c9_0%,#c8d8e4_45%,#ffffff_100%)]"
        />

        {/* Night sky */}
        <div
          ref={skyRef}
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#050a10_0%,#0d2430_45%,#2b5a5c_100%)]"
        />

        {/* Title */}
        <div
          ref={titleRef}
          className="absolute inset-x-0 top-[8vh] z-20 px-[5vw] will-change-transform"
        >
          <h1
            className="font-display font-light uppercase leading-[0.86] tracking-[-0.02em]
                       text-[clamp(2.75rem,11vw,10rem)] text-white
                       [text-wrap:balance] drop-shadow-[0_2px_30px_rgba(0,0,0,0.35)]"
          >
            {name}
          </h1>

          <p
            className="mt-[3vh] max-w-xl font-mono-ui text-[clamp(0.65rem,1.05vw,0.8rem)]
                       uppercase leading-relaxed tracking-[0.14em] text-white/85"
          >
            {tagline}
          </p>

          {onCta && (
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

        {/* Astronaut */}
        <div
          ref={astronautRef}
          className="pointer-events-none absolute left-1/2 top-[42vh] z-10 w-[clamp(11rem,26vw,24rem)]
                     -translate-x-1/2 will-change-transform"
        >
          <Image
            src={SPACE_IMAGES.astronaut.src}
            width={SPACE_IMAGES.astronaut.width}
            height={SPACE_IMAGES.astronaut.height}
            alt={SPACE_IMAGES.astronaut.alt}
            priority
            sizes="(max-width: 768px) 55vw, 26vw"
            className="h-auto w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
          />
        </div>

        {/* Cloud layers — far to near, all anchored to the bottom edge. */}
        <CloudLayer
          ref={cloudBackRef}
          image={SPACE_IMAGES.cloudWhite}
          className="bottom-[-6%] left-[-12%] z-[11] w-[85%] opacity-70"
        />
        <CloudLayer
          ref={cloudMidRef}
          image={SPACE_IMAGES.cloudTwo}
          className="bottom-[-14%] right-[-16%] z-[12] w-[95%] opacity-85"
        />
        <CloudLayer
          ref={cloudFrontRef}
          image={SPACE_IMAGES.cloudBanner}
          className="bottom-[-20%] left-[-8%] z-[13] w-[125%]"
        />

        {/* Final white-out, on top of everything, handing off to the page. */}
        <div
          ref={whiteRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0"
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
