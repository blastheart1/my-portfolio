"use client";

import { useEffect, useRef } from "react";

// Lerp helper
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Selectors that should trigger the "hover" cursor state
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, label[for]";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only mount on fine-pointer (mouse/trackpad) devices
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Add class to hide native cursor
    document.documentElement.classList.add("custom-cursor");

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: mouse.x, y: mouse.y };
    let hovered = false;
    let clicking = false;
    let rafId: number;

    const dot = dotRef.current!;
    const ringEl = ringRef.current!;

    // Show elements now that we know we're on a pointer device
    dot.style.opacity = "1";
    ringEl.style.opacity = "1";

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseDown() {
      clicking = true;
    }

    function onMouseUp() {
      clicking = false;
    }

    function onMouseEnter(e: MouseEvent) {
      if ((e.target as Element).closest(INTERACTIVE)) {
        hovered = true;
      }
    }

    function onMouseLeave(e: MouseEvent) {
      if ((e.target as Element).closest(INTERACTIVE)) {
        hovered = false;
      }
    }

    function tick() {
      if (prefersReduced) {
        // No lerp — just snap dot and skip ring
        dot.style.transform = `translate3d(${mouse.x - 4}px, ${mouse.y - 4}px, 0)`;
        ringEl.style.opacity = "0";
      } else {
        // Inner dot snaps exactly
        dot.style.transform = `translate3d(${mouse.x - 4}px, ${mouse.y - 4}px, 0)`;
        // Outer ring lerps behind
        ring.x = lerp(ring.x, mouse.x, 0.14);
        ring.y = lerp(ring.y, mouse.y, 0.14);

        const scale = clicking ? 0.8 : hovered ? 1.6 : 1;
        const ringSize = 28;
        ringEl.style.transform = `translate3d(${ring.x - ringSize / 2}px, ${ring.y - ringSize / 2}px, 0) scale(${scale})`;
        // Dot shrinks slightly on hover
        const dotScale = hovered ? 0.5 : 1;
        dot.style.transform = `translate3d(${mouse.x - 4}px, ${mouse.y - 4}px, 0) scale(${dotScale})`;
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseover", onMouseEnter, { passive: true });
    document.addEventListener("mouseout", onMouseLeave, { passive: true });

    // Disable on first touch (hybrid device touched)
    function onTouchStart() {
      document.documentElement.classList.remove("custom-cursor");
      dot.style.opacity = "0";
      ringEl.style.opacity = "0";
    }
    window.addEventListener("touchstart", onTouchStart, { once: true, passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseover", onMouseEnter);
      document.removeEventListener("mouseout", onMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Inner dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "var(--color-brand)",
          pointerEvents: "none",
          zIndex: 99999,
          willChange: "transform",
          opacity: 0, // shown via JS only on pointer:fine
          mixBlendMode: "difference",
          transition: "transform 0.08s ease",
        }}
      />
      {/* Outer ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1.5px solid var(--color-brand)",
          opacity: 0, // shown via JS only on pointer:fine
          pointerEvents: "none",
          zIndex: 99998,
          willChange: "transform",
          transition: "transform 0.12s ease, border-color 0.2s ease",
        }}
      />
    </>
  );
}
