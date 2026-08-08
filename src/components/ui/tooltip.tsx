'use client';

import * as React from 'react';

/**
 * A small hover/focus tooltip.
 *
 * Hand-rolled rather than adding @radix-ui/react-tooltip: the repo has no Radix
 * tooltip today, and this needs one behaviour on one element.
 *
 * Opens on hover *and* on keyboard focus, because a highlight whose explanation
 * is mouse-only is invisible to anyone tabbing through. The trigger is a real
 * <button> so it lands in the tab order at all, and carries the text in
 * aria-describedby so a screen reader gets it without any hovering.
 */
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
  const id = React.useId();

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // Touch has no hover, so a tap has to open it. Deliberately not a
        // toggle: a tap fires pointerover and focus first, both of which have
        // already opened it, so toggling would close it again and one tap
        // would show nothing. Blur, pointer-leave and Escape close it.
        onClick={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className={className}
      >
        {children}
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full right-0 z-50 mb-2 w-max max-w-[22rem]
                     whitespace-pre-line rounded-lg bg-gray-900 px-3 py-2 text-left text-xs
                     font-normal leading-relaxed text-white shadow-lg dark:bg-gray-800"
        >
          {content}
        </span>
      )}
    </span>
  );
}
