'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared data loader for the admin client editors.
 *
 * Replaces five near-identical Client*Loader components, each of which did:
 *
 *     .catch(() => setProjects([]))
 *
 * That collapses "the request failed" into "there is nothing here", so a
 * database outage or an expired session rendered as an empty list inviting the
 * owner to recreate content that already exists. Failure is now a distinct,
 * retryable state.
 */

export interface AdminFetchState<T> {
  data: T | null;
  error: string | null;
  /** True only for the first load; a refetch does not blank the screen. */
  loading: boolean;
  refetching: boolean;
  refetch: () => void;
}

export interface AdminFetchOptions<T> {
  /** Narrow/normalise the payload. Throw to treat it as a failed load. */
  select?: (raw: unknown) => T;
  /** Skip fetching (e.g. waiting on a route param). */
  enabled?: boolean;
}

/** Session expiry is a redirect, not an error message on a dead page. */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.href = '/edit/login?expired=1';
}

export function useAdminFetch<T>(
  url: string,
  options: AdminFetchOptions<T> = {}
): AdminFetchState<T> {
  const { select, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refetching, setRefetching] = useState(false);

  // Keep `select` out of the effect deps — callers pass inline arrows, which
  // would otherwise refetch on every render.
  const selectRef = useRef(select);
  selectRef.current = select;

  const load = useCallback(
    async (isRefetch: boolean) => {
      if (isRefetch) setRefetching(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { credentials: 'same-origin' });

        if (res.status === 401) {
          redirectToLogin();
          return;
        }

        if (!res.ok) {
          // Surface the server's own message where there is one — "Failed to
          // load" tells the owner nothing actionable.
          let message = `Request failed (${res.status})`;
          try {
            const body = await res.json();
            if (body?.error) message = String(body.error);
          } catch {
            /* non-JSON error body */
          }
          throw new Error(message);
        }

        const raw = await res.json();
        setData(selectRef.current ? selectRef.current(raw) : (raw as T));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    },
    [url]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load(false);
  }, [enabled, load]);

  const refetch = useCallback(() => {
    void load(true);
  }, [load]);

  return { data, error, loading, refetching, refetch };
}

/** Convenience for the common "endpoint returns an array" case. */
export function selectArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}
