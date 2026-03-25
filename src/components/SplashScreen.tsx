'use client';

import { useEffect, useRef, useState } from 'react';
import './splash.css';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted]               = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  // Guard against React Strict Mode double-invocation
  const initializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => { initializedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    if (initializedRef.current) return;   // skip Strict Mode second mount
    initializedRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any = null;
    let splitInstances: Array<{ revert: () => void; words: HTMLElement[] }> = [];
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let touchHandler: ((e: TouchEvent) => void) | null = null;

    const initGSAP = async () => {
      try {
        const { gsap }      = await import('gsap');
        const { Observer }  = await import('gsap/Observer');
        const { SplitText } = await import('gsap/SplitText');

        gsap.registerPlugin(Observer, SplitText);

        const container = containerRef.current;
        if (!container) return;

        const sections      = container.querySelectorAll<HTMLElement>('section');
        const images        = container.querySelectorAll<HTMLElement>('.bg');
        const headingEls    = gsap.utils.toArray<HTMLElement>('.section-heading');
        const outerWrappers = gsap.utils.toArray<HTMLElement>('.outer');
        const innerWrappers = gsap.utils.toArray<HTMLElement>('.inner');

        if (!sections.length || !images.length || !headingEls.length) return;

        // Create SplitText instances OUTSIDE the context so we can .revert() them first
        splitInstances = headingEls.map(el =>
          new SplitText(el, { type: 'words' }) as unknown as { revert: () => void; words: HTMLElement[] }
        );

        let currentIndex = -1;
        const wrap     = gsap.utils.wrap(0, sections.length);
        let animating  = false;
        let obs: ReturnType<typeof Observer.create>;

        // All GSAP mutations inside one context — ctx.revert() tears everything down cleanly
        ctx = gsap.context(() => {
          gsap.set(outerWrappers, { yPercent: 100 });
          gsap.set(innerWrappers, { yPercent: -100 });

          function gotoSection(index: number, direction: number) {
            index = wrap(index);
            animating = true;
            const dFactor = direction === -1 ? -1 : 1;

            const tl = gsap.timeline({
              defaults: { duration: 0.6, ease: 'power2.out' },
              onComplete: () => { animating = false; setCurrentSection(index); },
            });

            if (currentIndex >= 0) {
              gsap.set(sections[currentIndex], { zIndex: 0 });
              tl.to(images[currentIndex], { yPercent: -15 * dFactor })
                .set(sections[currentIndex], { autoAlpha: 0 });
            }

            gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });
            tl.fromTo(
                [outerWrappers[index], innerWrappers[index]],
                { yPercent: (i: number) => (i ? -100 * dFactor : 100 * dFactor) },
                { yPercent: 0 }, 0,
              )
              .fromTo(images[index], { yPercent: 15 * dFactor }, { yPercent: 0 }, 0)
              .fromTo(
                splitInstances[index].words,
                { autoAlpha: 0, yPercent: 120 * dFactor },
                { autoAlpha: 1, yPercent: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 },
                0.05,
              );

            currentIndex = index;
          }

          obs = Observer.create({
            type: 'wheel,touch,pointer',
            wheelSpeed: -1,
            onDown: () => { if (!animating && currentIndex > 0) gotoSection(currentIndex - 1, -1); },
            onUp:   () => {
              if (!animating && currentIndex < sections.length - 1) {
                gotoSection(currentIndex + 1, 1);
              } else if (!animating && currentIndex >= sections.length - 1) {
                obs.kill();
                onComplete?.();
              }
            },
            tolerance: 10,
            preventDefault: true,
          });

          gotoSection(0, 1);
        }, container);

        // Block touches outside the splash container only
        touchHandler = (e: TouchEvent) => {
          if (container && !container.contains(e.target as Node)) {
            e.preventDefault();
            e.stopPropagation();
          }
        };
        document.addEventListener('touchstart', touchHandler, { passive: false });
        document.addEventListener('touchmove',  touchHandler, { passive: false });
        document.addEventListener('touchend',   touchHandler, { passive: false });

        // Safety net: auto-complete after 8s so users never stay stuck
        fallbackTimer = setTimeout(() => onComplete?.(), 8000);

      } catch (err) {
        console.error('GSAP init failed:', err);
        setTimeout(() => onComplete?.(), 1500);
      }
    };

    initGSAP();

    return () => {
      initializedRef.current = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (touchHandler) {
        document.removeEventListener('touchstart', touchHandler);
        document.removeEventListener('touchmove',  touchHandler);
        document.removeEventListener('touchend',   touchHandler);
      }
      // Revert SplitText first — restores original DOM before GSAP context cleanup
      splitInstances.forEach(st => st.revert());
      splitInstances = [];
      // Kills all tweens, timelines, Observers, and inline style overrides
      ctx?.revert();
      ctx = null;
    };
  }, [mounted, onComplete]);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="splash-container"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
    >
      <section className="first">
        <div className="outer"><div className="inner"><div className="bg">
          <h2 className="section-heading">Welcome to Luis.dev</h2>
        </div></div></div>
      </section>
      <section className="second">
        <div className="outer"><div className="inner"><div className="bg">
          <h2 className="section-heading">Full-Stack Developer & AI Specialist</h2>
        </div></div></div>
      </section>
      <section className="third">
        <div className="outer"><div className="inner"><div className="bg">
          <h2 className="section-heading">Building the Future with Code</h2>
        </div></div></div>
      </section>
      <section className="fourth">
        <div className="outer"><div className="inner"><div className="bg">
          <h2 className="section-heading">Innovative Solutions & Scalable Systems</h2>
        </div></div></div>
      </section>
      <section className="fifth">
        <div className="outer"><div className="inner"><div className="bg">
          <h2 className="section-heading">Let&apos;s Build Something Amazing Together</h2>
        </div></div></div>
      </section>

      <div className="progress-indicator">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`progress-dot ${currentSection >= i ? 'active' : ''}`} />
        ))}
      </div>
      <div className="scroll-indicator">
        <div className="scroll-text">Scroll to explore</div>
        <div className="scroll-arrow">↓</div>
      </div>
    </div>
  );
}
