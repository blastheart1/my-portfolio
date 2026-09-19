/**
 * indexnow.test.ts
 *
 * IndexNow tells Bing, Yandex and Seznam a URL changed rather than waiting to be
 * crawled. It runs inside admin save paths, so the property that matters most is
 * that it can never turn a successful content save into an error the editor
 * sees. A search-engine ping is not worth failing a save over.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { submitToIndexNow, getIndexNowKey } from '../indexnow';

const KEY = 'abc123def456ghi789';
const ORIGINAL = process.env.INDEXNOW_KEY;
const fetchMock = vi.fn();

beforeEach(() => {
  process.env.INDEXNOW_KEY = KEY;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = ORIGINAL;
  vi.unstubAllGlobals();
});

describe('happy path', () => {
  it('submits absolute URLs built from the site origin', async () => {
    const result = await submitToIndexNow(['/', '/work']);

    expect(result.submitted).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.urlList).toEqual([
      'https://codebyluis.dev/',
      'https://codebyluis.dev/work',
    ]);
  });

  it('passes the key and its published location', async () => {
    await submitToIndexNow(['/']);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.key).toBe(KEY);
    // Without a reachable keyLocation the endpoint accepts and then ignores.
    expect(body.keyLocation).toBe(`https://codebyluis.dev/${KEY}.txt`);
    expect(body.host).toBe('codebyluis.dev');
  });

  it('accepts a 202, which means queued pending key validation', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 202 });

    expect((await submitToIndexNow(['/'])).submitted).toBe(true);
  });

  it('deduplicates repeated paths', async () => {
    await submitToIndexNow(['/', '/', '/work']);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).urlList).toHaveLength(2);
  });

  it('passes an absolute URL through unchanged', async () => {
    await submitToIndexNow(['https://codebyluis.dev/work/relay']);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).urlList).toEqual([
      'https://codebyluis.dev/work/relay',
    ]);
  });
});

describe('never breaks the caller', () => {
  it('reports rather than throws when the endpoint is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(submitToIndexNow(['/'])).resolves.toMatchObject({
      submitted: false,
      reason: 'unreachable',
    });
  });

  it('reports rather than throws when the endpoint rejects', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422 });

    await expect(submitToIndexNow(['/'])).resolves.toMatchObject({
      submitted: false,
      status: 422,
    });
  });

  it('does nothing at all when no key is configured', async () => {
    delete process.env.INDEXNOW_KEY;

    const result = await submitToIndexNow(['/']);

    expect(result).toMatchObject({ submitted: false, reason: 'INDEXNOW_KEY not set' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing for an empty list', async () => {
    await submitToIndexNow([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('key validation', () => {
  it('rejects a key that would make an unfetchable filename', () => {
    // The key doubles as the filename, so a path separator or a dot would
    // produce a verification file nothing can retrieve.
    for (const bad of ['../../etc/passwd', 'key with spaces', 'key.with.dots', 'short']) {
      process.env.INDEXNOW_KEY = bad;
      expect(getIndexNowKey(), bad).toBeNull();
    }
  });

  it('accepts a plain alphanumeric key', () => {
    process.env.INDEXNOW_KEY = KEY;
    expect(getIndexNowKey()).toBe(KEY);
  });
});
