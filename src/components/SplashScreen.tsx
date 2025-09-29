'use client';

import { useEffect, useRef, useState } from 'react';
import './splash.css';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Ensure component only renders on client side
  useEffect(() => {
    setMounted(true);
    
    // No scroll blocking - let GSAP handle everything naturally
    return () => {
      // Clean exit - no blocking needed
    };
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    let cleanup: (() => void) | undefined;

    const initGSAP = async () => {
      try {
        const { gsap } = await import('gsap');
        const { Observer } = await import('gsap/Observer');
        const { SplitText } = await import('gsap/SplitText');
        
        gsap.registerPlugin(Observer, SplitText);

        const sections = containerRef.current?.querySelectorAll("section");
        const images = containerRef.current?.querySelectorAll(".bg");
        const headings = gsap.utils.toArray(".section-heading");
        const outerWrappers = gsap.utils.toArray(".outer");
        const innerWrappers = gsap.utils.toArray(".inner");
        
        if (!sections || !images || !headings.length) return;

        const splitHeadings = headings.map((heading: any) => 
          new SplitText(heading, { 
            type: "chars,words,lines", 
            linesClass: "clip-text" 
          })
        );
        
        let currentIndex = -1;
        const wrap = gsap.utils.wrap(0, sections.length);
        let animating = false;

        gsap.set(outerWrappers, { yPercent: 100 });
        gsap.set(innerWrappers, { yPercent: -100 });

        function gotoSection(index: number, direction: number) {
          index = wrap(index);
          animating = true;
          const fromTop = direction === -1;
          const dFactor = fromTop ? -1 : 1;
          
        const tl = gsap.timeline({
          defaults: { duration: 0.8, ease: "power2.inOut" }, // Faster animation
          onComplete: () => {
            animating = false;
            setCurrentSection(index);
            
              // Section transition complete - no auto-completion needed
          }
        });

          if (currentIndex >= 0 && sections && images) {
            gsap.set(sections[currentIndex], { zIndex: 0 });
            tl.to(images[currentIndex], { yPercent: -15 * dFactor })
              .set(sections[currentIndex], { autoAlpha: 0 });
          }

          if (sections) {
            gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });
          }
          tl.fromTo([outerWrappers[index], innerWrappers[index]], { 
              yPercent: (i: number) => i ? -100 * dFactor : 100 * dFactor
            }, { 
              yPercent: 0 
            }, 0)
            .fromTo(images && images[index] ? images[index] : null, { yPercent: 15 * dFactor }, { yPercent: 0 }, 0)
            .fromTo(splitHeadings[index].chars, { 
                autoAlpha: 0, 
                yPercent: 150 * dFactor
            }, {
                autoAlpha: 1,
                yPercent: 0,
                duration: 0.6, // Faster text animation
                ease: "power2",
                stagger: {
                  each: 0.01, // Faster stagger
                  from: "random"
                }
              }, 0.1); // Earlier start

          currentIndex = index;
        }

        Observer.create({
          type: "wheel,touch,pointer",
          wheelSpeed: -1,
          onDown: () => {
            if (!animating && currentIndex > 0) {
              gotoSection(currentIndex - 1, -1);
            }
          },
          onUp: () => {
            if (!animating && sections && currentIndex < sections.length - 1) {
              gotoSection(currentIndex + 1, 1);
            } else if (!animating && sections && currentIndex >= sections.length - 1) {
              // On the last section, transition immediately to portfolio
              console.log('Last section reached - transitioning to portfolio');
              onComplete?.();
            }
          },
          tolerance: 10,
          preventDefault: true
        });

        // Let GSAP Observer handle all scroll events - no additional blocking needed

        gotoSection(0, 1);

        // Fallback: Auto-complete splash after 30 seconds to prevent getting stuck
        const fallbackTimeout = setTimeout(() => {
          console.log('Splash fallback triggered - auto completing');
          document.body.classList.remove('splash-active');
          document.documentElement.classList.remove('splash-active');
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.height = '';
          document.body.style.width = '';
          document.documentElement.style.overflow = '';
          onComplete?.();
        }, 30000);

        // Set cleanup function
        cleanup = () => {
          clearTimeout(fallbackTimeout);
          console.log('Splash cleanup - no blocking needed');
        };

      } catch (error) {
        console.error('Failed to load GSAP:', error);
        // Fallback: call onComplete after 3 seconds if GSAP fails
        setTimeout(() => {
          onComplete?.();
        }, 3000);
      }
    };

    initGSAP();

    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, [mounted, onComplete]);

  if (!mounted) {
    return null;
  }

  return (
    <div ref={containerRef} className="splash-container">
      {/* Section 1: Welcome */}
      <section className="first">
        <div className="outer">
          <div className="inner">
            <div className="bg">
              <h2 className="section-heading">
                Welcome to Luis.dev
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: About */}
      <section className="second">
        <div className="outer">
          <div className="inner">
            <div className="bg">
              <h2 className="section-heading">
                Full-Stack Developer & AI Specialist
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Skills */}
      <section className="third">
        <div className="outer">
          <div className="inner">
            <div className="bg">
              <h2 className="section-heading">
                Building the Future with Code
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Projects */}
      <section className="fourth">
        <div className="outer">
          <div className="inner">
            <div className="bg">
              <h2 className="section-heading">
                Innovative Solutions & Scalable Systems
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Contact */}
      <section className="fifth">
        <div className="outer">
          <div className="inner">
            <div className="bg">
              <h2 className="section-heading">
                Let's Build Something Amazing Together
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Indicator */}
      <div className="progress-indicator">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`progress-dot ${currentSection >= index ? 'active' : ''}`}
          />
        ))}
      </div>
      
      {/* Debug Info */}
      <div className="fixed top-4 left-4 text-white text-sm bg-black/50 px-2 py-1 rounded">
        Section: {currentSection + 1}/5
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator">
        <div className="scroll-text">Scroll to explore</div>
        <div className="scroll-arrow">↓</div>
      </div>
    </div>
  );
}
