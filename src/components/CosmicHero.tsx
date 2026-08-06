'use client';

import * as React from 'react';
import Image from 'next/image';

import { useScrollY } from '@/contexts/ScrollContext';
import { SPACE_IMAGES } from '@/lib/space-assets';
import { cn } from '@/lib/utils';

/**
 * Scroll-driven space hero.
 *
 * The sequence, matching the reference frames:
 *
 *   0.00  night sky, title, astronaut sharp and close
 *   0.30  sky warms to teal, title lifts away, first clouds reach the astronaut
 *   0.50  astronaut recedes and begins dissolving into the bank
 *   0.70  sky is lavender, only the helmet still shows above the clouds
 *   0.85  astronaut gone, clouds fill the frame
 *   1.00  clouds thin out to a soft off-white and hand off to the page
 *
 * Three things this gets right that a naive version does not:
 *
 * 1. The astronaut RECEDES rather than descending. It scales down and fades
 *    while staying near the centre, so it reads as moving away into the cloud
 *    rather than falling behind it.
 * 2. The sky is a colour journey — three stacked gradients crossfading — not
 *    one gradient fading to white. Fading to white desaturates through grey,
 *    which is the muddy look the reference avoids.
 * 3. The clouds scale up as they rise, so they genuinely engulf the viewport
 *    instead of sliding across it as flat cards.
 *
 * All scroll work is one ScrollContext subscription writing to refs: no
 * per-frame React renders, only compositable properties, geometry measured on
 * resize rather than inside the handler.
 */

/**
 * Total scroll distance for the sequence, in vh.
 *
 * 260vh minus the 100vh sticky viewport leaves ~160vh of travel — one to two
 * screen-heights. Longer than this and the cloud bank has to keep growing to
 * fill the extra distance, which is what made it feel heavy and over-clouded
 * near the end.
 */
const SCENE_VH = 260;

/**
 * Progress at which the scene is fully white.
 *
 * Deliberately short of 1.0. Finishing the fade exactly at the end means the
 * next section arrives on the same frame the cover completes — there is no
 * white to travel through, which is what makes the handoff read as a cut. The
 * remaining scroll is held at full white so the release of the sticky element
 * happens invisibly.
 */
const RESOLVE_COMPLETE = 0.90;

/**
 * End state.
 *
 * Must be the page's own background, not a hand-picked off-white: the section
 * below the hero paints `bg-background`, so any other value leaves a visible
 * seam at the handoff — and gets it badly wrong in dark mode, where the page
 * is near-black while this scene is all daylight and cloud.
 */
const RESOLVE_COLOR = 'var(--background)';

interface CosmicHeroProps {
  name?: string;
  tagline?: string;
  ctaLabel?: string;
  /** Renders the CTA as a link. Takes precedence over onCta. */
  ctaHref?: string;
  onCta?: () => void;
  className?: string;
}

const CTA_CLASS =
  'mt-[4.5vh] inline-flex items-center gap-2.5 rounded-full border border-white/55 ' +
  'px-7 py-3 font-mono-ui text-[0.68rem] uppercase tracking-[0.18em] text-white ' +
  'transition-colors duration-200 hover:border-white hover:bg-white/10 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

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
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

/**
 * Cloud layers, far to near.
 *
 * `rise` is travel in vh; `scale` is how much the layer grows as it arrives,
 * which is what makes the bank close over the viewport rather than slide past.
 * Windows overlap heavily so the bank thickens continuously.
 */
const CLOUD_LAYERS = [
  // Far bank — the horizon the astronaut floats above.
  {
    image: SPACE_IMAGES.cloudWhite, start: 0.00, end: 0.42, rise: 44, scale: 1.15, front: false,
    // The art is roughly 2:1 landscape. At 86% width on a phone that is a
    // ~180px-tall strip that the mask all but erases, which is why mobile
    // showed a bare gradient. Mobile gets a much wider layer — width drives
    // height here — sitting higher up the viewport.
    className: 'bottom-[18%] left-[-55%] w-[210%] opacity-50 md:bottom-[4%] md:left-[-20%] md:w-[86%]',
  },
  {
    image: SPACE_IMAGES.cloudTwo, start: 0.06, end: 0.50, rise: 58, scale: 1.2, front: false,
    className: 'bottom-[10%] right-[-50%] w-[200%] opacity-70 md:bottom-[-2%] md:right-[-22%] md:w-[94%]',
  },

  // Waterline — reaches the feet and takes it under.
  {
    image: SPACE_IMAGES.cloudBanner, start: 0.18, end: 0.62, rise: 74, scale: 1.3, front: true,
    className: 'bottom-[2%] left-[-45%] w-[230%] opacity-90 md:bottom-[-10%] md:left-[-16%] md:w-[112%]',
  },

  // Closing over — across the body, then the helmet.
  {
    image: SPACE_IMAGES.cloudTwo, start: 0.32, end: 0.76, rise: 92, scale: 1.4, front: true,
    className: 'bottom-[-8%] right-[-55%] w-[250%] md:bottom-[-20%] md:right-[-18%] md:w-[130%]',
  },
  {
    image: SPACE_IMAGES.cloudBanner, start: 0.44, end: 0.88, rise: 108, scale: 1.5, front: true,
    className: 'bottom-[-18%] left-[-50%] w-[270%] md:bottom-[-28%] md:left-[-14%] md:w-[145%]',
  },
] as const;

export default function CosmicHero({
  name = 'Antonio Luis Santos',
  tagline = 'AI Full-Stack Software Engineer — building systems that automate, integrate, and scale.',
  ctaLabel = 'Schedule a call',
  ctaHref,
  onCta,
  className,
}: CosmicHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { subscribe } = useScrollY();

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const skyDuskRef = React.useRef<HTMLDivElement>(null);
  const skyDayRef = React.useRef<HTMLDivElement>(null);
  const resolveRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLDivElement>(null);
  const astronautRef = React.useRef<HTMLDivElement>(null);
  const cloudRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Cached scene geometry.
   *
   * `ready` matters: the hero renders inside SplashWrapper, which can gate the
   * content, so a measurement taken on mount may find a zero-height element.
   * Combined with a divide-by-zero guard that clamps travel to 1px, that made
   * the entire sequence complete within a single pixel of scrolling — the
   * whole scene flashing past in one wheel notch. The scene now refuses to
   * animate until it has measured a plausible height, and re-measures whenever
   * layout actually changes.
   */
  const geometry = React.useRef({ top: 0, travel: 0, ready: false });

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const travel = el.offsetHeight - window.innerHeight;

      geometry.current = {
        top: rect.top + window.scrollY,
        travel,
        // A real scene is several viewports tall. Anything shorter than half a
        // viewport means we measured before layout settled.
        ready: travel > window.innerHeight * 0.5,
      };
    };

    measure();

    // Re-measure on any layout change to this element — splash dismissal, font
    // swap, cloud images arriving. A window resize listener alone misses all
    // three, which is how the bad first measurement used to stick.
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('load', measure);
    };
  }, []);

  React.useEffect(() => {
    if (reducedMotion) return;

    return subscribe(scrollY => {
      const { top, travel, ready } = geometry.current;
      // Not yet laid out — leave the scene in its initial state rather than
      // snapping it to the end.
      if (!ready) return;

      const p = clamp01((scrollY - top) / travel);

      // ── Sky: night -> teal dusk -> lavender day ─────────────────────────
      // Crossfading three gradients keeps the hue moving through colour
      // instead of desaturating toward grey.
      if (skyDuskRef.current) {
        skyDuskRef.current.style.opacity = String(range(p, 0.06, 0.34));
      }
      if (skyDayRef.current) {
        skyDayRef.current.style.opacity = String(range(p, 0.30, 0.64));
      }

      // ── Title ───────────────────────────────────────────────────────────
      if (titleRef.current) {
        const out = range(p, 0.10, 0.32);
        titleRef.current.style.transform = `translate3d(0, ${-out * 130}px, 0)`;
        titleRef.current.style.opacity = String(1 - out);
      }

      // ── Astronaut: sinks and is swallowed ───────────────────────────────
      // Keeps its size throughout. Scaling it down read as the figure
      // retreating into the distance; in the reference it stays the same size
      // and simply goes under, which is what makes it feel like drowning
      // rather than flying away. The tilt comes from the idle bob on the inner
      // element, so nothing here should touch scale.
      if (astronautRef.current) {
        const sink = range(p, 0.02, 0.72);
        const drop = sink * 324;                     // 240 * 1.35
        const sway = Math.sin(p * Math.PI * 1.5) * 41;   // 30 * 1.35
        const fade = 1 - range(p, 0.52, 0.74);

        astronautRef.current.style.transform =
          `translate3d(${sway}px, ${drop}px, 0)`;
        astronautRef.current.style.opacity = String(fade);
      }

      // ── Clouds: rise and swell until they fill the frame ────────────────
      CLOUD_LAYERS.forEach((layer, i) => {
        const el = cloudRefs.current[i];
        if (!el) return;
        const t = range(p, layer.start, layer.end);
        const scale = 1 + (layer.scale - 1) * t;
        el.style.transform = `translate3d(0, ${(1 - t) * layer.rise}vh, 0) scale(${scale})`;
      });

      // ── Resolve: clouds thin out, then hold pure white ──────────────────
      // Holding past RESOLVE_COMPLETE is what lets the sticky element release
      // behind an already-opaque cover.
      if (resolveRef.current) {
        resolveRef.current.style.opacity = String(range(p, 0.66, RESOLVE_COMPLETE));
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
        {/* Night — the base everything else fades in over. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#04100d_0%,#0a1f1e_38%,#2e5f59_72%,#4e837a_100%)]"
        />

        {/* Teal dusk */}
        <div
          ref={skyDuskRef}
          aria-hidden="true"
          className="absolute inset-0 opacity-0 bg-[linear-gradient(180deg,#123430_0%,#3d6f68_40%,#8fa8b8_78%,#c3c2dc_100%)]"
        />

        {/* Lavender day */}
        <div
          ref={skyDayRef}
          aria-hidden="true"
          className="absolute inset-0 opacity-0 bg-[linear-gradient(180deg,#9fb6c9_0%,#c4c3de_38%,#e4e2ee_70%,#f4f3f8_100%)]"
        />

        {/* Title */}
        <div
          ref={titleRef}
          // z-10: deliberately BELOW the astronaut (z-20). In the reference the
          // helmet passes in front of the wordmark, which is what sells the
          // figure as being in the scene rather than pasted over it.
          className="absolute inset-x-0 top-[9vh] z-10 px-[5vw] will-change-transform"
        >
          <h1
            className="font-display font-light uppercase leading-[0.86] tracking-[-0.02em]
                       text-[clamp(2.5rem,10.5vw,9.5rem)] text-white
                       [text-wrap:balance]
                       [text-shadow:0_2px_40px_rgba(0,0,0,0.45)]"
          >
            {name}
          </h1>

          <p
            className="mt-[3.5vh] max-w-xl font-mono-ui text-[clamp(0.62rem,1vw,0.78rem)]
                       uppercase leading-relaxed tracking-[0.16em] text-white/85"
          >
            {tagline}
          </p>

          {/* Matches the reference's pill: hairline border, sparkle, wide
              letterspaced mono caps. Rendered as a link when it points at a
              URL so it stays keyboard- and middle-click friendly. */}
          {ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_CLASS}
            >
              <span aria-hidden="true" className="text-[0.9em]">✦</span>
              {ctaLabel}
            </a>
          ) : onCta ? (
            <button type="button" onClick={onCta} className={CTA_CLASS}>
              <span aria-hidden="true" className="text-[0.9em]">✦</span>
              {ctaLabel}
            </button>
          ) : null}

        </div>

        {/* Far cloud layers — behind the astronaut. */}
        {CLOUD_LAYERS.map((layer, i) =>
          layer.front ? null : (
            <CloudLayer
              key={i}
              ref={el => { cloudRefs.current[i] = el; }}
              image={layer.image}
              className={cn(layer.className, 'z-[5]')}
            />
          )
        )}

        {/* Astronaut.
            Outer element carries the scroll transform; the inner one carries
            the idle bob, because both animate `transform` and would otherwise
            overwrite each other every frame.

            NO drop-shadow on the image. A filter with a 70px blur radius
            creates a filter region far larger than the image box, and inside
            nested promoted layers iOS Safari rasterises that region with the
            wrong bounds — it painted as a translucent rectangle around the
            figure that only corrected itself once a scroll invalidated the
            layer. The glow below is a plain gradient: same look, no filter,
            nothing for the compositor to get wrong. */}
        <div
          ref={astronautRef}
          className="pointer-events-none absolute left-1/2 top-[30vh] z-20 w-[clamp(10rem,23vw,21rem)]
                     -translate-x-1/2 will-change-transform"
        >
          <div className={cn('relative', reducedMotion ? undefined : 'cosmic-float')}>
            {/* Soft shadow, painted rather than filtered. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-[8%] bottom-[2%] -z-10 h-[38%] rounded-[50%]
                         bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0)_72%)]"
            />
            <Image
              src={SPACE_IMAGES.astronaut.src}
              width={SPACE_IMAGES.astronaut.width}
              height={SPACE_IMAGES.astronaut.height}
              alt={SPACE_IMAGES.astronaut.alt}
              priority
              sizes="(max-width: 768px) 50vw, 23vw"
              className="relative h-auto w-full"
            />
          </div>
        </div>

        {/* Near cloud layers — pass in front of the astronaut. */}
        {CLOUD_LAYERS.map((layer, i) =>
          layer.front ? (
            <CloudLayer
              key={i}
              ref={el => { cloudRefs.current[i] = el; }}
              image={layer.image}
              className={cn(layer.className, 'z-[21]')}
            />
          ) : null
        )}

        {/* Softens the bottom so no cloud rectangle ever shows an edge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[24] h-[45vh]"
          style={{
            // color-mix keeps the fade in the page's own colour so the ramp
            // and the final flood are the same hue.
            background:
              `linear-gradient(180deg,` +
              ` color-mix(in srgb, ${RESOLVE_COLOR} 0%, transparent) 0%,` +
              ` color-mix(in srgb, ${RESOLVE_COLOR} 70%, transparent) 55%,` +
              ` ${RESOLVE_COLOR} 100%)`,
          }}
        />

        {/* Final resolve to the page background. */}
        <div
          ref={resolveRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[25] opacity-0"
          style={{ backgroundColor: RESOLVE_COLOR }}
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
      className={cn(
        'cosmic-cloud-mask pointer-events-none absolute origin-bottom will-change-transform',
        className
      )}
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
