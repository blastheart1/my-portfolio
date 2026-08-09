'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

/**
 * A small hover/focus tooltip.
 *
 * Rendered into a portal on `document.body` with `position: fixed`, not as an
 * absolutely-positioned child. That is the fix for it being clipped: the demo
 * frame in CaseStudyLayout sets `overflow-hidden`, and an absolute element
 * inside an overflow-hidden ancestor is cut off whatever its z-index. Raising
 * z-index would have looked like a fix and changed nothing.
 *
 * Position is measured from the trigger and flipped below when there is not
 * room above, which is the case here since the trigger sits at the top of the
 * frame. It is also clamped to the viewport so a wide tooltip near an edge
 * cannot run off-screen.
 *
 * Opens on hover and on keyboard focus, because an explanation only reachable
 * with a mouse is unreachable to anyone tabbing. The trigger is a real button
 * so it lands in the tab order, and carries the text via aria-describedby so a
 * screen reader gets it without hovering at all.
 */

const GAP = 8;
const MARGIN = 12;

export default function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  // Measured after paint, when the tooltip has a real size to place.
  React.useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tip = tipRef.current?.getBoundingClientRect();
      if (!trigger || !tip) return;

      const above = trigger.top - tip.height - GAP;
      const below = trigger.bottom + GAP;
      // Flip below when there is not room above — the usual case here, since
      // the trigger sits at the top of the demo frame.
      const top = above >= MARGIN ? above : below;

      const ideal = trigger.right - tip.width;
      const maxLeft = window.innerWidth - tip.width - MARGIN;
      const left = Math.max(MARGIN, Math.min(ideal, maxLeft));

      setStyle({ position: 'fixed', top, left, maxWidth: `min(22rem, calc(100vw - ${MARGIN * 2}px))` });
    };

    place();
    // Scrolling or resizing moves the trigger out from under a fixed element.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setStyle(null);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={close}
        onFocus={() => setOpen(true)}
        onBlur={close}
        // Touch has no hover, so a tap has to open it. Deliberately not a
        // toggle: a tap fires pointerover and focus first, both of which have
        // already opened it, so toggling would close it again.
        onClick={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') close();
        }}
        className={className}
      >
        {children}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            // Hidden until measured, so it never flashes at the wrong place.
            style={style ?? { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
            className="z-[100] whitespace-pre-line rounded-lg bg-gray-900 px-3 py-2 text-left
                       text-xs font-normal leading-relaxed text-white shadow-lg dark:bg-gray-800"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
