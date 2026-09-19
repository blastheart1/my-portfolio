import { buildLlmsTxt, llmsResponse } from '@/lib/llms-txt';

/**
 * /llms-full.txt
 *
 * The long form: the same map as /llms.txt with the case-study prose and post
 * excerpts inlined. This is the variant an assistant ingesting the site whole
 * should read, rather than fetching a dozen pages to reconstruct it.
 *
 * One trap worth knowing about. next.config.ts rewrites
 * `/:key([A-Za-z0-9-]{8,128}).txt` to the IndexNow key handler. "llms" is four
 * characters and cannot match it, but "llms-full" is nine and does. This route
 * wins only because an array-form rewrites() is applied afterFiles, so real
 * routes resolve first. That is load-bearing and one config edit away from
 * breaking, which is why N14 tests it rather than trusting a comment.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return llmsResponse(await buildLlmsTxt({ full: true }));
}
