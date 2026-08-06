'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SkeletonList } from '@/components/ui/skeleton';
import type { AdminFetchState } from '@/hooks/useAdminFetch';

/**
 * Renders the three states every admin list shares, so each editor does not
 * reinvent them: loading, load failure, and loaded.
 *
 * "Empty" is deliberately NOT handled here — an empty list is real data, and
 * the copy and primary action differ per entity. Editors render their own
 * EmptyState.
 */
interface AdminResourceProps<T> {
  state: AdminFetchState<T>;
  children: (data: T) => React.ReactNode;
  /** Rows to draw in the loading skeleton; match the real list length. */
  skeletonRows?: number;
  /** Overrides the skeleton entirely (e.g. a form-shaped placeholder). */
  loadingFallback?: React.ReactNode;
}

export default function AdminResource<T>({
  state,
  children,
  skeletonRows = 5,
  loadingFallback,
}: AdminResourceProps<T>) {
  const { data, error, loading, refetch } = state;

  if (loading) {
    return <>{loadingFallback ?? <SkeletonList rows={skeletonRows} />}</>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Couldn’t load this</AlertTitle>
        <AlertDescription>
          {/* The real status, not a generic string — it is usually the
              difference between "retry" and "go fix your database". */}
          <p>{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium
                       transition-colors hover:bg-secondary focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data === null) return null;

  return <>{children(data)}</>;
}
