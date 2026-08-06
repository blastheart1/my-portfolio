import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Empty state for admin lists.
 *
 * Per §3.4: an icon, one line, and the primary action inline. An empty list
 * that only says "No projects" makes the owner hunt for the Add button that
 * is somewhere else on the page.
 */
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed',
        'border-border bg-card/50 px-6 py-12 text-center',
        className
      )}
    >
      <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
