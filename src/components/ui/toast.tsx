'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Toast notifications for the admin surface.
 *
 * Replaces five duplicated `status` + setTimeout state machines across the
 * editors, each with slightly different timing and wording.
 *
 * Behaviour is asymmetric on purpose (handoff §3.4):
 *   - success auto-dismisses after 2.6s — the owner saw it, move on
 *   - errors persist until dismissed and carry a Retry action, because an
 *     error that vanishes on its own is an error the owner never read
 */

const SUCCESS_DURATION_MS = 2600

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  action?: ToastAction
  /** Override auto-dismiss. Errors ignore this and always persist. */
  durationMs?: number
}

interface ToastRecord extends ToastOptions {
  id: number
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number
  success: (title: string, description?: string) => number
  error: (title: string, options?: { description?: string; retry?: () => void }) => number
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([])
  const nextId = React.useRef(1)
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = React.useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = React.useCallback(
    (options: ToastOptions): number => {
      const id = nextId.current++
      const variant = options.variant ?? 'info'
      setToasts(prev => [...prev, { ...options, variant, id }])

      // Errors never auto-dismiss — see the docblock.
      if (variant !== 'error') {
        const ms = options.durationMs ?? SUCCESS_DURATION_MS
        timers.current.set(id, setTimeout(() => dismiss(id), ms))
      }
      return id
    },
    [dismiss]
  )

  const success = React.useCallback(
    (title: string, description?: string) => toast({ title, description, variant: 'success' }),
    [toast]
  )

  const error = React.useCallback(
    (title: string, options?: { description?: string; retry?: () => void }) =>
      toast({
        title,
        description: options?.description,
        variant: 'error',
        action: options?.retry ? { label: 'Retry', onClick: options.retry } : undefined,
      }),
    [toast]
  )

  // Clear pending timers if the provider unmounts mid-flight.
  React.useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = React.useMemo(
    () => ({ toast, success, error, dismiss }),
    [toast, success, error, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      // Errors are assertive; everything else waits its turn.
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const isError = toast.variant === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn(
        'animate-admin-fade-up pointer-events-auto rounded-lg border bg-card p-3 shadow-lg',
        isError ? 'border-destructive/40' : 'border-border'
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full',
            toast.variant === 'success' && 'bg-ok',
            toast.variant === 'error' && 'bg-destructive',
            toast.variant === 'info' && 'bg-muted-foreground'
          )}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-card-foreground">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 break-words text-xs text-muted-foreground">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.onClick()
                onDismiss()
              }}
              className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium
                         transition-colors hover:bg-secondary focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-ring"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors
                     hover:text-foreground focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-ring"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  )
}
