import { SITE_URL } from '@/lib/site';

/**
 * IndexNow: tell search engines a URL changed instead of waiting to be crawled.
 *
 * Bing, Yandex and Seznam accept it; submitting to any one endpoint shares the
 * ping with the others. Google does not participate, so this is not a
 * replacement for Search Console — it is the other half.
 *
 * It matters more than the traffic split suggests. ChatGPT search and Copilot
 * ground on Bing's index, so being in Bing quickly is a generative-search
 * concern rather than a Bing-traffic one.
 *
 * Verification is a key file served at the site root whose contents are the key
 * itself. Without it the endpoint accepts the request and ignores it, which is
 * why the route asserts the key exists rather than assuming.
 */

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Requests are dropped rather than queued, so a slow endpoint cannot stall a save. */
const TIMEOUT_MS = 4000;

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY;
  // The key doubles as the filename, so anything path-unsafe would produce a
  // verification file that cannot be fetched.
  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) return null;
  return key;
}

export interface SubmitResult {
  submitted: boolean;
  reason?: string;
  status?: number;
}

/**
 * Notifies IndexNow that these URLs changed.
 *
 * Never throws. This is called from admin save paths, and a search-engine ping
 * failing must not turn a successful content save into an error the editor
 * sees — the save is the thing that mattered.
 */
export async function submitToIndexNow(paths: string[]): Promise<SubmitResult> {
  const key = getIndexNowKey();
  if (!key) return { submitted: false, reason: 'INDEXNOW_KEY not set' };

  const host = new URL(SITE_URL).host;
  const urlList = [...new Set(paths)].map(path =>
    path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
  );

  if (urlList.length === 0) return { submitted: false, reason: 'no urls' };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // 200 accepted, 202 accepted pending key validation. Both are successes.
    if (response.ok || response.status === 202) {
      return { submitted: true, status: response.status };
    }
    console.error(`IndexNow responded ${response.status} for ${urlList.length} url(s)`);
    return { submitted: false, status: response.status, reason: 'rejected' };
  } catch (err) {
    console.error('IndexNow submission failed:', err);
    return { submitted: false, reason: 'unreachable' };
  }
}
