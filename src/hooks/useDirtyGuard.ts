'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Guards against losing unsaved edits.
 *
 * Two failure modes existed before this: collapsing a ServiceTierEditor
 * accordion silently discarded the draft, and navigating away from any editor
 * did the same with no warning.
 *
 * Covers both:
 *   - `beforeunload` for closing the tab or a hard navigation
 *   - `confirmDiscard()` for in-app transitions the browser cannot intercept
 *     (sidebar links, closing a drawer, collapsing a row)
 */
export function useDirtyGuard(isDirty: boolean) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Browsers ignore custom text now, but preventDefault still triggers
      // the native "leave site?" prompt.
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  /**
   * Run `action` immediately when clean; otherwise stash it and open the
   * discard dialog. Returns true when the action was deferred.
   */
  const guard = useCallback((action: () => void): boolean => {
    if (!dirtyRef.current) {
      action();
      return false;
    }
    setPendingAction(() => action);
    return true;
  }, []);

  const confirmDiscard = useCallback(() => {
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const cancelDiscard = useCallback(() => setPendingAction(null), []);

  return {
    /** True while the discard dialog should be shown. */
    isConfirming: pendingAction !== null,
    guard,
    confirmDiscard,
    cancelDiscard,
  };
}
