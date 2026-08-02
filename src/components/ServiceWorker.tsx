"use client";

import { useEffect } from 'react';

/**
 * Service worker removal shim.
 *
 * The previous /sw.js precached Create-React-App paths (/static/js/bundle.js,
 * /static/css/main.css, /manifest.json) that do not exist in this Next.js app.
 * cache.addAll() is atomic, so install always failed — which was the only
 * thing preventing its cache-first fetch handler from pinning visitors to
 * stale HTML and caching /api/* responses. That would have silently undone the
 * edge caching and revalidatePath invalidation this site depends on.
 *
 * sw.js is deleted. This component unregisters any worker still installed on a
 * returning visitor's device and clears its caches — without it, anyone who
 * did register the old worker could keep serving from it, since a deleted
 * sw.js means the browser has nothing to update to.
 *
 * Vercel plus the Cache-Control headers in next.config.ts already handle
 * immutable asset caching, so nothing replaces it.
 *
 * TODO: remove this component once traffic has cycled (a few weeks is ample
 * for a portfolio site).
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      })
      .catch(() => {
        // Best-effort: a failure here must never break the page.
      });

    // Drop anything the old worker cached, so a stale HTML document cannot be
    // served from the Cache Storage API after the worker itself is gone.
    if ('caches' in window) {
      caches
        .keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .catch(() => {
          /* best-effort */
        });
    }
  }, []);

  return null;
}
