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
        // Touch has no hover: tapping toggles instead of doing nothing.
        onClick={() => setOpen(o => !o)}
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
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2
                     rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-relaxed
                     text-white shadow-lg dark:bg-gray-800"
        >
          {content}
        </span>
      )}
    </span>
  );
}
