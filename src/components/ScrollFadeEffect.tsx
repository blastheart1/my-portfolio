"use client";

import { useEffect, useState, useRef } from "react";
import { useScrollY } from "@/contexts/ScrollContext";

interface ScrollFadeEffectProps {
  children: React.ReactNode;
  className?: string;
  fadeStartPoint?: number;
  fadeIntensity?: number;
  disableFade?: boolean;
}

export default function ScrollFadeEffect({
  children,
  className = "",
  fadeStartPoint = 0.75,
  fadeIntensity = 1.5,
  disableFade = false,
}: ScrollFadeEffectProps) {
  const [opacity, setOpacity] = useState(1);
  const elementRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useScrollY();

  useEffect(() => {
    if (disableFade) {
      setOpacity(1);
      return;
    }

    const unsubscribe = subscribe((scrollTop) => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollPercentage = scrollTop / (documentHeight - windowHeight);

      let newOpacity = 1;

      if (scrollPercentage > fadeStartPoint) {
        const fadeProgress = (scrollPercentage - fadeStartPoint) / (1 - fadeStartPoint);
        newOpacity = Math.max(0, 1 - fadeProgress * fadeIntensity);
      } else if (scrollPercentage > fadeStartPoint * 0.8) {
        const fadeInProgress = Math.pow(scrollPercentage / fadeStartPoint, 0.3);
        newOpacity = Math.min(1, fadeInProgress);
        if (scrollPercentage > fadeStartPoint * 0.9) {
          newOpacity = Math.max(newOpacity, 0.7);
        } else if (scrollPercentage > fadeStartPoint * 0.7) {
          newOpacity = Math.max(newOpacity, 0.4);
        }
      }

      setOpacity(newOpacity);
    });

    return unsubscribe;
  }, [subscribe, fadeStartPoint, fadeIntensity, disableFade]);

  return (
    <div
      ref={elementRef}
      className={`transition-opacity duration-500 ease-out ${className}`}
      style={{
        opacity,
        pointerEvents: opacity < 0.1 ? 'none' : 'auto',
      }}
    >
      {children}
    </div>
  );
}
