import { buildLlmsTxt, llmsResponse } from '@/lib/llms-txt';

/**
 * /llms.txt
 *
 * Replaces public/llms.txt, which was 153 lines maintained by hand and free to
 * contradict the prices in the JSON-LD.
 *
 * ── public/llms.txt MUST stay deleted ────────────────────────────────────────
 * A file in public/ shadows an App Router route of the same path, silently.
 * Leaving it in place means this handler never executes, the stale copy serves
 * forever, and a test that imports this module still passes. Guard rail N14
 * asserts the file is gone, the same way N7 asserts public/sw.js is.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * buildLlmsTxt catches every data read individually, so a database outage
 * drops a section rather than the response. That matters more than it looks:
 * scripts/check-indexability.sh hard-asserts this path returns 200, and a
 * crawler treats a 500 on it as a site fault.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return llmsResponse(await buildLlmsTxt());
}
