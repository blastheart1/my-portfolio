/**
 * verify-links.test.ts
 *
 * Guard rail:
 *   N17 — a case study may never cite an off-allowlist or dead URL, and a
 *         403/405/timeout must downgrade rather than reject
 *
 * The second half of N17 is the one that needs pinning hardest. It is very
 * easy to write this module as "200 or it is a lie", and that version rejects
 * nearly every real case study, because the exact publishers the generator is
 * told to cite answer 403 to a HEAD from a datacenter IP. The cron would then
 * publish nothing, indefinitely, while still returning success.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  isAllowedSource,
  RESEARCH_ALLOWLIST,
  SOURCE_ALLOWLIST,
  verifyAll,
  verifyUrl,
} from '../verify-links';

const AWS = 'https://aws.amazon.com/solutions/case-studies/example';
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function status(code: number) {
  return { status: code, ok: code >= 200 && code < 300 };
}

function timeoutError() {
  const error = new Error('The operation was aborted due to timeout');
  error.name = 'TimeoutError';
  return error;
}

describe('isAllowedSource', () => {
  it('accepts every domain the generator prompt names', () => {
    for (const domain of SOURCE_ALLOWLIST) {
      expect(isAllowedSource(`https://${domain}/a-page`), domain).toBe(true);
    }
  });

  it('accepts a subdomain of an allowed domain', () => {
    expect(isAllowedSource('https://www.ibm.com/case-studies/acme')).toBe(true);
  });

  it('rejects a lookalike host that merely ends with the domain name', () => {
    // The substring check this mistake usually looks like would accept these.
    expect(isAllowedSource('https://ibm.com.attacker.test/x')).toBe(false);
    expect(isAllowedSource('https://notibm.com/x')).toBe(false);
    expect(isAllowedSource('https://evil-gartner.com/x')).toBe(false);
  });

  it('rejects http, since a cited source must not downgrade the reader', () => {
    expect(isAllowedSource('http://aws.amazon.com/x')).toBe(false);
  });

  it('rejects a non-allowlisted domain and a malformed URL', () => {
    expect(isAllowedSource('https://medium.com/@someone/post')).toBe(false);
    expect(isAllowedSource('not a url')).toBe(false);
    expect(isAllowedSource('')).toBe(false);
  });

  it('rejects a javascript: URL', () => {
    expect(isAllowedSource('javascript:alert(1)')).toBe(false);
  });
});

describe('verifyUrl — confirmed', () => {
  it.each([200, 204, 301, 302, 308])('treats %i as ok', async code => {
    fetchMock.mockResolvedValue(status(code));
    await expect(verifyUrl(AWS)).resolves.toBe('ok');
  });

  it('asks with HEAD first, since it is the cheap question', async () => {
    fetchMock.mockResolvedValue(status(200));
    await verifyUrl(AWS);
    expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
  });

  it('follows redirects rather than reading a 301 as an answer in itself', async () => {
    fetchMock.mockResolvedValue(status(200));
    await verifyUrl(AWS);
    expect(fetchMock.mock.calls[0][1].redirect).toBe('follow');
  });
});

describe('verifyUrl — unverified rather than rejected', () => {
  it('downgrades a 403, which is what these publishers actually return', async () => {
    fetchMock.mockResolvedValue(status(403));
    await expect(verifyUrl(AWS)).resolves.toBe('unverified');
  });

  it.each([401, 429, 500, 503])('downgrades %i', async code => {
    fetchMock.mockResolvedValue(status(code));
    await expect(verifyUrl(AWS)).resolves.toBe('unverified');
  });

  it('downgrades a timeout, because slow is not missing', async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(verifyUrl(AWS)).resolves.toBe('unverified');
  });

  it('retries a 405 as a ranged GET, and accepts that answer', async () => {
    fetchMock
      .mockResolvedValueOnce(status(405))
      .mockResolvedValueOnce(status(200));

    await expect(verifyUrl(AWS)).resolves.toBe('ok');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
    // One byte is enough to learn whether the resource exists.
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ range: 'bytes=0-0' });
  });

  it('downgrades when even the ranged GET is refused', async () => {
    fetchMock.mockResolvedValue(status(405));
    await expect(verifyUrl(AWS)).resolves.toBe('unverified');
  });

  it('reports a dead page found via the ranged retry as dead, not unverified', async () => {
    fetchMock
      .mockResolvedValueOnce(status(405))
      .mockResolvedValueOnce(status(404));

    await expect(verifyUrl(AWS)).resolves.toBe('dead');
  });
});

describe('verifyUrl — dead, the fabrication signal', () => {
  it.each([404, 410])('treats %i as dead', async code => {
    fetchMock.mockResolvedValue(status(code));
    await expect(verifyUrl(AWS)).resolves.toBe('dead');
  });

  it('treats a hostname that does not resolve as dead', async () => {
    // A citation to a domain that does not exist is the clearest evidence the
    // model invented it.
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(verifyUrl(AWS)).resolves.toBe('dead');
  });

  it('rejects an off-allowlist URL without spending a request on it', async () => {
    await expect(verifyUrl('https://medium.com/@someone/post')).resolves.toBe('dead');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verifyUrl — never throws', () => {
  it('survives an unexpected rejection', async () => {
    fetchMock.mockRejectedValue('not even an Error');
    await expect(verifyUrl(AWS)).resolves.toBe('dead');
  });
});

describe('verifyAll', () => {
  it('returns a verdict per URL', async () => {
    fetchMock.mockResolvedValue(status(200));

    const results = await verifyAll([AWS, 'https://www.ibm.com/case-studies/acme']);

    expect(results.size).toBe(2);
    expect(results.get(AWS)).toBe('ok');
  });

  it('checks each distinct URL once', async () => {
    fetchMock.mockResolvedValue(status(200));

    await verifyAll([AWS, AWS, AWS]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bounds how many requests are in flight at once', async () => {
    let inFlight = 0;
    let peak = 0;
    fetchMock.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise(resolve => setTimeout(resolve, 1));
      inFlight -= 1;
      return status(200);
    });

    const urls = Array.from({ length: 10 }, (_, i) => `https://ibm.com/case-studies/${i}`);
    await verifyAll(urls, 3);

    expect(peak).toBeLessThanOrEqual(3);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('handles an empty list without hanging', async () => {
    await expect(verifyAll([])).resolves.toEqual(new Map());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a mix of verdicts rather than collapsing to the worst', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/gone') ? status(404) : status(200)
    );

    const results = await verifyAll([
      'https://ibm.com/case-studies/live',
      'https://ibm.com/case-studies/gone',
    ]);

    expect(results.get('https://ibm.com/case-studies/live')).toBe('ok');
    expect(results.get('https://ibm.com/case-studies/gone')).toBe('dead');
  });
});


/**
 * The research allowlist.
 *
 * The consultancy list exists for generated case studies. The first
 * hand-written post cited arXiv, OpenAI and Anthropic — every one of which
 * that list marks `dead`, which would have rejected a post whose sourcing was
 * its strongest feature.
 */
describe('research citations', () => {
  const ARXIV = 'https://arxiv.org/abs/2504.18565';

  it('accepts every domain on the research list', () => {
    for (const domain of RESEARCH_ALLOWLIST) {
      expect(isAllowedSource(`https://${domain}/a-paper`, RESEARCH_ALLOWLIST), domain).toBe(true);
    }
  });

  it('rejects a research citation under the consultancy list, and vice versa', () => {
    // The two lists are for different kinds of post and must not be merged.
    expect(isAllowedSource(ARXIV, SOURCE_ALLOWLIST)).toBe(false);
    expect(isAllowedSource(ARXIV, RESEARCH_ALLOWLIST)).toBe(true);

    const aws = 'https://aws.amazon.com/solutions/case-studies/x';
    expect(isAllowedSource(aws, RESEARCH_ALLOWLIST)).toBe(false);
    expect(isAllowedSource(aws, SOURCE_ALLOWLIST)).toBe(true);
  });

  it('still rejects a lookalike host on the research list', () => {
    expect(isAllowedSource('https://arxiv.org.attacker.test/x', RESEARCH_ALLOWLIST)).toBe(false);
  });

  it('downgrades a 403 from a publisher rather than calling it fabricated', async () => {
    // openai.com answers 403 to automated requests. Treating that as a dead
    // link would reject a citation that is perfectly real — this was hit for
    // real while verifying the first essay.
    fetchMock.mockResolvedValue(status(403));

    await expect(
      verifyUrl('https://openai.com/index/safety-alignment-long-horizon-models/', RESEARCH_ALLOWLIST)
    ).resolves.toBe('unverified');
  });

  it('verifies a live research citation as ok', async () => {
    fetchMock.mockResolvedValue(status(200));
    await expect(verifyUrl(ARXIV, RESEARCH_ALLOWLIST)).resolves.toBe('ok');
  });

  it('passes the list through verifyAll', async () => {
    fetchMock.mockResolvedValue(status(200));

    const results = await verifyAll([ARXIV], 4, RESEARCH_ALLOWLIST);

    expect(results.get(ARXIV)).toBe('ok');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('defaults to the consultancy list, so existing callers are unchanged', async () => {
    await expect(verifyUrl(ARXIV)).resolves.toBe('dead');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
