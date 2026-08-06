'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Tabs with real ARIA semantics and roving focus.
 *
 * The chatbot page previously used styled buttons with no tablist role, so a
 * screen reader announced three unrelated buttons and arrow keys did nothing.
 * Per APG: one tab in the tab order, arrows move between tabs, Home/End jump
 * to the ends.
 */

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
  baseId: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs(): TabsContextValue {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>')
  return ctx
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  const baseId = React.useId()
  const ctx = React.useMemo(
    () => ({ value, setValue: onValueChange, baseId }),
    [value, onValueChange, baseId]
  )
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label: string
}) {
  const listRef = React.useRef<HTMLDivElement>(null)

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(e.key)) return

    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    )
    if (tabs.length === 0) return

    const current = tabs.findIndex(t => t === document.activeElement)
    let next = current

    if (e.key === 'ArrowRight') next = (current + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1

    e.preventDefault()
    tabs[next]?.focus()
    tabs[next]?.click()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-1 border-b border-border', className)}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: active, setValue, baseId } = useTabs()
  const selected = active === value

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      // Roving tabindex: only the active tab is in the tab order.
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-[var(--color-brand)] text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: active, baseId } = useTabs()
  if (active !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('animate-admin-fade-up pt-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}
