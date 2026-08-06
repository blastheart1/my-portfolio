'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Modal dialog — hand-rolled, no Radix (the brief forbids new component deps).
 *
 * Implements the parts that are easy to get wrong and that a naive
 * `{open && <div>}` misses entirely:
 *   - focus moves into the dialog on open and returns to the trigger on close
 *   - Tab cycles within the dialog rather than escaping to the page behind
 *   - Escape closes; a backdrop click closes
 *   - the page behind cannot scroll while open
 */

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Accessible name; rendered as the heading unless `hideTitle`. */
  title: string
  description?: string
  className?: string
  /** Selector for the element to focus on open. Defaults to the first. */
  initialFocus?: 'first' | 'cancel'
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  initialFocus = 'first',
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const descId = React.useId()

  React.useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Lock background scroll.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus in. For destructive dialogs the safe option (Cancel) should
    // be focused, so an accidental Enter does not delete anything.
    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (focusables?.length) {
      const target =
        initialFocus === 'cancel'
          ? panel!.querySelector<HTMLElement>('[data-dialog-cancel]') ?? focusables[0]
          : focusables[0]
      target.focus()
    } else {
      panel?.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onOpenChange(false)
        return
      }
      if (e.key !== 'Tab') return

      // Focus trap.
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
  }, [open, onOpenChange, initialFocus])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
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
          'animate-admin-fade-up relative w-full max-w-md rounded-xl border border-border',
          'bg-card p-5 shadow-xl focus:outline-none',
          className
        )}
      >
        <h2 id={titleId} className="text-base font-semibold text-card-foreground">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

/** Footer row — actions right-aligned, cancel first in DOM order. */
export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-5 flex justify-end gap-2', className)}>{children}</div>
}

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  /** Rendered above the actions — e.g. a thumbnail of the record being deleted. */
  preview?: React.ReactNode
  pending?: boolean
}

/**
 * Destructive confirmation.
 *
 * Replaces the four bare window.confirm() calls, which could not name the
 * record, could not show what was about to be lost, and were unstyleable.
 * Focus lands on Cancel.
 */
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  preview,
  pending = false,
}: AlertDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      initialFocus="cancel"
    >
      {preview && <div className="mb-4">{preview}</div>}

      <DialogFooter className="mt-0">
        <button
          type="button"
          data-dialog-cancel
          onClick={() => onOpenChange(false)}
          disabled={pending}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium
                     transition-colors hover:bg-secondary disabled:opacity-50
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-white
                     transition-opacity hover:opacity-90 disabled:opacity-50
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          {pending ? 'Deleting…' : confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
