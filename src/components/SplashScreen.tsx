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
    
    // Add splash-active class to block scrolling
    document.body.classList.add('splash-active');
    document.documentElement.classList.add('splash-active');
    
    return () => {
      // Remove splash-active class on cleanup
      document.body.classList.remove('splash-active');
      document.documentElement.classList.remove('splash-active');
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

        const splitHeadings = headings.map((heading: unknown) => 
          new SplitText(heading as HTMLElement, { 
            type: "chars,words,lines", 
            linesClass: "clip-text" 
          })
        );
        
        let currentIndex = -1;
        let animating = false;

        gsap.set(outerWrappers, { yPercent: 100 });
        gsap.set(innerWrappers, { yPercent: -100 });

        function gotoSection(index: number, direction: number) {
          // Prevent wrapping - don't allow going beyond bounds
          if (!sections || index < 0 || index >= sections.length) {
            return;
          }
          
          animating = true;
          const fromTop = direction === -1;
          const dFactor = fromTop ? -1 : 1;
          
        const tl = gsap.timeline({
          defaults: { duration: 0.6, ease: "power2.out" }, // More responsive animation
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
                duration: 0.4, // More responsive text animation
                ease: "power2.out",
                stagger: {
                  each: 0.005, // More responsive stagger
                  from: "random"
                }
              }, 0.05); // Earlier start for better responsiveness

          currentIndex = index;
        }

        const observer = Observer.create({
          type: "wheel,touch,pointer",
          wheelSpeed: -1,
          onDown: () => {
            // Only allow going back if not at first section
            if (!animating && currentIndex > 0) {
              gotoSection(currentIndex - 1, -1);
            }
          },
          onUp: () => {
            // Only allow going forward if not at last section
            if (!animating && sections && currentIndex < sections.length - 1) {
              gotoSection(currentIndex + 1, 1);
            } else if (!animating && sections && currentIndex === sections.length - 1) {
              // On the last section, start smooth scroll transition to portfolio
              console.log('Last section reached - starting scroll transition to portfolio');
              
              // Disable observer immediately to prevent any further navigation
              observer.disable();
              
              // Create smooth scroll-out animation for the splash container
              const scrollOutTimeline = gsap.timeline({
                onComplete: () => {
                  // Ensure scroll is properly restored before completing
                  document.body.style.overflow = 'auto';
                  document.documentElement.style.overflow = 'auto';
                  onComplete?.();
                }
              });
              
              // Scroll the splash container up and out of view
              scrollOutTimeline.to(containerRef.current, {
                y: "-100%",
                duration: 1.0,
                ease: "power2.inOut"
              });
            }
          },
          tolerance: 10,
          preventDefault: true,
          // Isolate observer to only work within splash container
          target: containerRef.current
        });

        // Add targeted touch event handling to prevent portfolio interaction (desktop only)
        const handleTouchEvents = (e: TouchEvent) => {
          // Only prevent if the touch is outside the splash container
          if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            e.preventDefault();
            e.stopPropagation();
          }
        };

        // Add scroll event blocking to prevent portfolio scroll during splash
        const handleScrollEvents = (e: Event) => {
          // Only block scroll events that are not from the splash container
          if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        };

        // Add document-level touch event prevention with proper cleanup
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        let touchEventOptions = { passive: false, capture: true };
        
        // Always add touch event blocking to prevent mobile scroll
        document.addEventListener('touchstart', handleTouchEvents, touchEventOptions);
        document.addEventListener('touchmove', handleTouchEvents, touchEventOptions);
        document.addEventListener('touchend', handleTouchEvents, touchEventOptions);
        
        // Block scroll events from reaching portfolio
        document.addEventListener('scroll', handleScrollEvents, { capture: true });
        document.addEventListener('wheel', handleScrollEvents, { capture: true });

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
          // Disable observer to restore scroll functionality
          observer.disable();
          
          // Remove document-level touch event listeners with same options
          document.removeEventListener('touchstart', handleTouchEvents, touchEventOptions);
          document.removeEventListener('touchmove', handleTouchEvents, touchEventOptions);
          document.removeEventListener('touchend', handleTouchEvents, touchEventOptions);
          
          // Remove scroll event blocking
          document.removeEventListener('scroll', handleScrollEvents, { capture: true });
          document.removeEventListener('wheel', handleScrollEvents, { capture: true });
          
          console.log('Splash cleanup - observer disabled, touch events removed, scroll events unblocked, scroll restored');
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
    <div 
      ref={containerRef} 
      className="splash-container"
      onTouchStart={(e) => {
        // Allow touch events on splash screen
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        // Allow touch events on splash screen
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        // Allow touch events on splash screen
        e.stopPropagation();
      }}
    >
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
                Let&apos;s Build Something Amazing Together
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
      
      {/* Debug Info - Removed section indicators */}

      {/* Scroll Indicator */}
      <div className="scroll-indicator">
        <div className="scroll-text">Scroll to explore</div>
        <div className="scroll-arrow">↓</div>
      </div>
    </div>
  );
}
