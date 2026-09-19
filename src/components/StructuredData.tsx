import { graph } from '@/lib/structured-data';

/**
 * Renders a JSON-LD graph.
 *
 * Nothing but a <script> tag. The nodes themselves are built by pure functions
 * in src/lib/structured-data.ts, so they can be asserted in a unit test
 * without rendering anything.
 *
 * ── This file must never become a client component ───────────────────────────
 * It is tempting, when scoping JSON-LD per route, to add 'use client' and
 * branch on usePathname(). That deletes the graph from the server HTML
 * entirely: React injects the script on hydration, so it still appears in
 * devtools and in a React test, and is absent for every crawler, every model,
 * and every `curl`. The failure is invisible in exactly the places people
 * check. Guard rail N15 asserts this file contains neither 'use client' nor
 * usePathname.
 *
 * Scope by choosing where to render this instead: the root layout renders the
 * identity nodes, and each page renders its own.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function StructuredData({ nodes }: { nodes: readonly unknown[] }) {
  if (nodes.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(nodes)) }}
    />
  );
}
