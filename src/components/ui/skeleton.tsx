import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Loading placeholder.
 *
 * Skeletons must match the height of the content they stand in for, otherwise
 * the page reflows when data lands — which reads as a second, worse loading
 * state. Prefer the composed helpers below over ad-hoc sizes.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // aria-hidden: a screen reader should hear the live region announce
      // "Loading…" once, not read a wall of empty boxes.
      aria-hidden="true"
      className={cn("animate-admin-skeleton rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * The standard list-page skeleton: a header block plus N row blocks, sized to
 * the real rows so nothing shifts on arrival.
 */
function SkeletonList({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-48" />
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Form skeleton — label/control pairs at the real rhythm. */
function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonList, SkeletonForm }
