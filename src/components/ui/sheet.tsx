'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Edge-anchored overlay panel.
 *
 * Two uses in the admin, hence the `side` prop:
 *   - left: the mobile navigation sheet (below md)
 *   - right: the Experience editor drawer, which keeps the list visible while
 *     editing rather than swapping it out for a form
 *
 * Shares the dialog's focus discipline: focus in on open, restored on close,
 * trapped while open, Escape to dismiss.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'left' | 'right'
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  /** Called instead of closing when the sheet has unsaved changes. */
  onRequestClose?: () => boolean
}

export function Sheet({
  open,
  onOpenChange,
  side = 'right',
  title,
  description,
  children,
  className,
  onRequestClose,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const descId = React.useId()

  // Returns false when the consumer vetoed the close (e.g. unsaved changes).
  const requestClose = React.useCallback(() => {
    if (onRequestClose && onRequestClose() === false) return
    onOpenChange(false)
  }, [onOpenChange, onRequestClose])

  React.useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        requestClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!items || items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, requestClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={requestClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-[min(28rem,100vw)] flex-col border-border bg-card shadow-xl focus:outline-none',
          side === 'right'
            ? 'right-0 border-l animate-admin-drawer'
            : 'left-0 border-r animate-admin-sheet',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-card-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors
                       hover:bg-secondary hover:text-foreground focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
