/**
 * Source-link verification.
 *
 * The generator asserts a `caseStudyLink` and a list of sources. Nothing ever
 * checked that any of them resolve, which makes a fabricated citation
 * indistinguishable from a real one — and a fabricated citation on an indexed
 * page is the single worst thing this content pipeline could produce.
 *
 * The verdict is deliberately three-valued rather than a boolean.
 *
 * A boolean forces "anything that is not 200 is a lie", and that is false in
 * practice: AWS, Gartner, McKinsey and Forrester routinely answer 403 or 405
 * to a HEAD from a datacenter IP. Treating those as fabrication would reject
 * nearly every genuine case study, the cron would publish nothing, and nobody
 * would notice — the route already returns a success body when it decides not
 * to generate, so silence is its normal state.
 *
 * So: `dead` means the link is evidence of fabrication and the post is
 * rejected. `unverified` means we could not confirm it either way, and the
 * post is downgraded to an ordinary blog entry with the link stripped rather
 * than thrown away.
 */

export type LinkVerdict = 'ok' | 'unverified' | 'dead';

/** Per-request ceiling. Short: this runs several times inside one cron call. */
const TIMEOUT_MS = 5_000;

/**
 * Domains a case study may cite, matching the set the generator's prompt names.
 * Anything else is either a hallucinated source or a citation nobody vetted.
 */
export const SOURCE_ALLOWLIST: readonly string[] = [
  'aws.amazon.com',
  'cloud.google.com',
  'customers.microsoft.com',
  'ibm.com',
  'mckinsey.com',
  'deloitte.com',
  'gartner.com',
  'forrester.com',
];

/**
 * Domains an essay may cite.
 *
 * The consultancy list above exists because the generator was told to write
 * case studies from vendor customer stories. An essay citing research needs a
 * different set entirely — the first hand-written post cited arXiv, OpenAI and
 * Anthropic, every one of which the list above would have marked `dead`,
 * rejecting a post whose sourcing was its strongest feature.
 *
 * Primary sources only, deliberately. A preprint server, a lab's own
 * publication, a standards body or a university is something a reader can go
 * and check. A news write-up of a paper is not, and citing one is how a claim
 * drifts from what the paper actually said.
 */
export const RESEARCH_ALLOWLIST: readonly string[] = [
  'arxiv.org',
  'openai.com',
  'anthropic.com',
  'deepmind.google',
  'internationalaisafetyreport.org',
  'nist.gov',
  'acm.org',
  'ieee.org',
  'nature.com',
  'science.org',
  'neurips.cc',
  'aclanthology.org',
];

/**
 * Whether a URL points at an allow-listed source.
 *
 * Matches the host exactly or as a subdomain, anchored on a leading dot, so
 * `ibm.com` accepts `www.ibm.com` but not `ibm.com.attacker.test` — the
 * substring check that mistake usually looks like.
 */
export function isAllowedSource(
  url: string,
  allowlist: readonly string[] = SOURCE_ALLOWLIST
): boolean {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }

  return allowlist.some(domain => host === domain || host.endsWith(`.${domain}`));
}

/** Maps an HTTP status to a verdict. */
function verdictForStatus(status: number): LinkVerdict {
  if (status >= 200 && status < 400) return 'ok';
  // Gone and Not Found are the publisher telling us the page is not there.
  if (status === 404 || status === 410) return 'dead';
  // Everything else — 401, 403, 429, any 5xx — says something about the
  // request or the server, not about whether the page exists.
  return 'unverified';
}

/**
 * Checks that a URL resolves.
 *
 * HEAD first because it is cheap, then a ranged GET when the host rejects the
 * method outright. Never throws: a verification step that can raise would turn
 * an unreachable third party into a failed cron run.
 */
export async function verifyUrl(
  url: string,
  allowlist: readonly string[] = SOURCE_ALLOWLIST
): Promise<LinkVerdict> {
  if (!isAllowedSource(url, allowlist)) return 'dead';

  const head = await request(url, 'HEAD');
  if (head !== 'method-not-allowed') return head;

  // Some CDNs answer 405 to HEAD but serve a ranged GET happily. One byte is
  // enough to learn whether the resource is there.
  const ranged = await request(url, 'GET', { range: 'bytes=0-0' });
  return ranged === 'method-not-allowed' ? 'unverified' : ranged;
}

async function request(
  url: string,
  method: 'HEAD' | 'GET',
  headers: Record<string, string> = {}
): Promise<LinkVerdict | 'method-not-allowed'> {
  try {
    const res = await fetch(url, {
      method,
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 405) return 'method-not-allowed';
    return verdictForStatus(res.status);
  } catch (error) {
    // A timeout says the host is slow, not that the page is missing.
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return 'unverified';
    }
    // Anything else is a transport failure — most often a hostname that does
    // not resolve, which is exactly what a fabricated citation looks like.
    return 'dead';
  }
}

/**
 * Verifies several URLs with a bounded number in flight.
 *
 * The cron runs inside a serverless function with a fixed duration budget, so
 * a post citing eight sources must not turn into eight sequential five-second
 * waits. Neither may it open all of them at once against one host.
 */
export async function verifyAll(
  urls: readonly string[],
  concurrency = 4,
  allowlist: readonly string[] = SOURCE_ALLOWLIST
): Promise<Map<string, LinkVerdict>> {
  const unique = [...new Set(urls)];
  const results = new Map<string, LinkVerdict>();
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < unique.length) {
      const url = unique[cursor];
      cursor += 1;
      results.set(url, await verifyUrl(url, allowlist));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, worker)
  );

  return results;
}
