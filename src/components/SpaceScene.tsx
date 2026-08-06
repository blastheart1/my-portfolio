'use client';

import * as React from 'react';
import Image from 'next/image';

import { useScrollY } from '@/contexts/ScrollContext';
import { SPACE_IMAGES, SPACE_VIDEOS, type SpaceVideoKey } from '@/lib/space-assets';
import { cn } from '@/lib/utils';

/**
 * Scroll-driven space scene: a lightspeed backdrop, parallax cloud layers, and
 * a drifting astronaut.
 *
 * Performance rules this follows, because a full-bleed scene is the easiest
 * place on a site to lose a frame budget:
 *
 *   - One scroll subscription for the whole scene, via ScrollContext's single
 *     rAF-throttled listener. Layers are moved by writing transform on refs,
 *     so scrolling never triggers a React render.
 *   - Only transform and opacity are animated — both composited, neither
 *     triggers layout.
 *   - Geometry is read once per resize, not per scroll event, so the scroll
 *     handler never forces a synchronous layout.
 *   - The video is paused until the scene is actually on screen, and never
 *     loaded at all under prefers-reduced-motion.
 */

interface SpaceSceneProps {
  children?: React.ReactNode;
  /** Which lightspeed clip to use as the backdrop. Omit for no video. */
  video?: SpaceVideoKey;
  className?: string;
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

export default function SpaceScene({ children, video, className }: SpaceSceneProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { subscribe } = useScrollY();

  const sectionRef = React.useRef<HTMLElement>(null);
  const astronautRef = React.useRef<HTMLDivElement>(null);
  const cloudBackRef = React.useRef<HTMLDivElement>(null);
  const cloudMidRef = React.useRef<HTMLDivElement>(null);
  const cloudFrontRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const [videoVisible, setVideoVisible] = React.useState(false);

  // Cache geometry rather than calling getBoundingClientRect inside the
  // scroll handler, which would force layout on every frame.
  const geometry = React.useRef({ top: 0, height: 1 });

  React.useEffect(() => {
    const measure = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      geometry.current = {
        top: rect.top + window.scrollY,
        height: rect.height || 1,
      };
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Pause the video whenever the scene is off screen. A background video that
  // keeps decoding while nobody is looking is pure battery cost.
  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el || !video || reducedMotion) return;

    const observer = new IntersectionObserver(
      entries => setVideoVisible(entries[0]?.isIntersecting ?? false),
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [video, reducedMotion]);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (videoVisible) {
      // play() rejects if the browser blocks autoplay; nothing to do about it
      // and it must not surface as an unhandled rejection.
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [videoVisible]);

  React.useEffect(() => {
    if (reducedMotion) return;

    return subscribe(scrollY => {
      const { top, height } = geometry.current;

      // 0 as the section enters the viewport bottom, 1 as it leaves the top.
      const raw = (scrollY + window.innerHeight - top) / (height + window.innerHeight);
      const progress = Math.max(0, Math.min(1, raw));

      // Depth: the further back a layer sits, the less it moves.
      const back = cloudBackRef.current;
      const mid = cloudMidRef.current;
      const front = cloudFrontRef.current;
      const astronaut = astronautRef.current;

      if (back) back.style.transform = `translate3d(0, ${progress * -40}px, 0)`;
      if (mid) mid.style.transform = `translate3d(0, ${progress * -110}px, 0)`;
      if (front) front.style.transform = `translate3d(0, ${progress * -220}px, 0)`;

      if (astronaut) {
        // Drifts up and across, with a slow tumble.
        const drift = progress * -160;
        const sway = Math.sin(progress * Math.PI * 2) * 26;
        const spin = progress * 24 - 12;
        astronaut.style.transform =
          `translate3d(${sway}px, ${drift}px, 0) rotate(${spin}deg)`;
      }
    });
  }, [subscribe, reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className={cn('relative isolate overflow-hidden', className)}
    >
      {/* Lightspeed backdrop */}
      {video && !reducedMotion && (
        <video
          ref={videoRef}
          // preload="none" so the clip costs nothing until the scene is
          // actually reached; the gradient backdrop covers the gap.
          preload="none"
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 -z-10 size-full object-cover opacity-70"
        >
          <source src={SPACE_VIDEOS[video]} type="video/mp4" />
        </video>
      )}

      {/* Fallback backdrop — also what reduced-motion users get. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_0%,#1b2b3a_0%,#0a0f16_60%,#05080c_100%)]"
      />

      {/* Cloud layers, far to near. Decorative, so alt is empty. */}
      <CloudLayer
        ref={cloudBackRef}
        image={SPACE_IMAGES.cloudWhite}
        className="bottom-[18%] left-[-10%] w-[70%] opacity-30 blur-[2px]"
      />
      <CloudLayer
        ref={cloudMidRef}
        image={SPACE_IMAGES.cloudTwo}
        className="bottom-[4%] right-[-14%] w-[85%] opacity-45"
      />
      <CloudLayer
        ref={cloudFrontRef}
        image={SPACE_IMAGES.cloudBanner}
        className="bottom-[-12%] left-[-6%] w-[110%] opacity-70"
      />

      {/* Astronaut */}
      <div
        ref={astronautRef}
        className="pointer-events-none absolute right-[6%] top-[14%] z-10 w-[clamp(7rem,18vw,16rem)] will-change-transform"
      >
        <Image
          src={SPACE_IMAGES.astronaut.src}
          width={SPACE_IMAGES.astronaut.width}
          height={SPACE_IMAGES.astronaut.height}
          alt={SPACE_IMAGES.astronaut.alt}
          className="h-auto w-full drop-shadow-[0_20px_45px_rgba(0,0,0,0.55)]"
          sizes="(max-width: 768px) 40vw, 18vw"
        />
      </div>

      <div className="relative z-20">{children}</div>
    </section>
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
        className="h-auto w-full select-none"
        sizes="100vw"
      />
    </div>
  );
});
