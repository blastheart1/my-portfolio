/**
 * transport.test.ts
 *
 * These three functions were private to the relay pipeline until the blog
 * publish gate needed them too. Extracting shared code is only safe if the
 * extracted version is pinned, so this covers the parts both callers depend
 * on: the request shape each provider requires, a non-2xx raising rather than
 * returning an empty string, and parseJson never throwing.
 *
 * parseJson is the one worth reading twice. Every caller uses it on a path
 * where a malformed model reply must degrade to a known state. If it ever
 * starts throwing, a model that writes prose instead of JSON turns into a 500
 * on a public route.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { callAnthropic, callOpenAI, parseJson } from '../transport';

const fetchMock = vi.fn();

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The JSON body of the single request the mock recorded. */
function sentBody(): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[0][1].body as string);
}

function sentHeaders(): Record<string, string> {
  return fetchMock.mock.calls[0][1].headers as Record<string, string>;
}

describe('callOpenAI', () => {
  it('sends the model it is given rather than a module default', async () => {
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{}' } }] }));

    await callOpenAI('sk-test', 'gpt-4o-mini', 'system text', 'user text');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
    expect(sentBody().model).toBe('gpt-4o-mini');
  });

  it('always asks for a JSON object, so parseJson is a net rather than the path', async () => {
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{}' } }] }));

    await callOpenAI('sk-test', 'gpt-4o-mini', 's', 'u');

    expect(sentBody().response_format).toEqual({ type: 'json_object' });
  });

  it('sends the key as a bearer token and both messages in order', async () => {
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{}' } }] }));

    await callOpenAI('sk-test', 'gpt-4o-mini', 'system text', 'user text');

    expect(sentHeaders().authorization).toBe('Bearer sk-test');
    expect(sentBody().messages).toEqual([
      { role: 'system', content: 'system text' },
      { role: 'user', content: 'user text' },
    ]);
  });

  it('applies temperature and max_tokens overrides, and omits max_tokens otherwise', async () => {
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{}' } }] }));
    await callOpenAI('k', 'm', 's', 'u', { temperature: 0.1, maxTokens: 512 });
    expect(sentBody().temperature).toBe(0.1);
    expect(sentBody().max_tokens).toBe(512);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{}' } }] }));
    await callOpenAI('k', 'm', 's', 'u');
    expect(sentBody()).not.toHaveProperty('max_tokens');
    expect(sentBody().temperature).toBe(0.6);
  });

  it('returns the message content', async () => {
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{"a":1}' } }] }));

    await expect(callOpenAI('k', 'm', 's', 'u')).resolves.toBe('{"a":1}');
  });

  it('returns an empty string when the reply has no choices, rather than throwing', async () => {
    fetchMock.mockResolvedValue(okJson({}));

    await expect(callOpenAI('k', 'm', 's', 'u')).resolves.toBe('');
  });

  it('throws on a non-2xx, naming the status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    await expect(callOpenAI('k', 'm', 's', 'u')).rejects.toThrow('OpenAI responded 429');
  });

  it('passes an abort signal, so a hung upstream cannot pin the route', async () => {
    fetchMock.mockResolvedValue(okJson({ choices: [{ message: { content: '{}' } }] }));

    await callOpenAI('k', 'm', 's', 'u');

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});

describe('callAnthropic', () => {
  it('sends the model, system and user message in Anthropic’s shape', async () => {
    fetchMock.mockResolvedValue(okJson({ content: [{ text: '{}' }] }));

    await callAnthropic('sk-ant', 'claude-sonnet-4-5-20250929', 'system text', 'user text');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    );
    const body = sentBody();
    expect(body.model).toBe('claude-sonnet-4-5-20250929');
    expect(body.system).toBe('system text');
    expect(body.messages).toEqual([{ role: 'user', content: 'user text' }]);
  });

  it('sends the key in x-api-key with a pinned API version', async () => {
    fetchMock.mockResolvedValue(okJson({ content: [{ text: '{}' }] }));

    await callAnthropic('sk-ant', 'm', 's', 'u');

    expect(sentHeaders()['x-api-key']).toBe('sk-ant');
    expect(sentHeaders()['anthropic-version']).toBe('2023-06-01');
    // The key must never leak into the Authorization header as well.
    expect(sentHeaders()).not.toHaveProperty('authorization');
  });

  it('defaults max_tokens, since Anthropic requires it', async () => {
    fetchMock.mockResolvedValue(okJson({ content: [{ text: '{}' }] }));
    await callAnthropic('k', 'm', 's', 'u');
    expect(sentBody().max_tokens).toBe(1024);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okJson({ content: [{ text: '{}' }] }));
    await callAnthropic('k', 'm', 's', 'u', { maxTokens: 4096 });
    expect(sentBody().max_tokens).toBe(4096);
  });

  it('returns the first content block, or an empty string when there is none', async () => {
    fetchMock.mockResolvedValue(okJson({ content: [{ text: 'hello' }] }));
    await expect(callAnthropic('k', 'm', 's', 'u')).resolves.toBe('hello');

    fetchMock.mockResolvedValue(okJson({ content: [] }));
    await expect(callAnthropic('k', 'm', 's', 'u')).resolves.toBe('');
  });

  it('throws on a non-2xx, naming the status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 529, json: async () => ({}) });

    await expect(callAnthropic('k', 'm', 's', 'u')).rejects.toThrow('Anthropic responded 529');
  });
});

describe('parseJson', () => {
  it('parses a plain object', () => {
    expect(parseJson('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('strips a fenced block, which models emit despite instructions', () => {
    expect(parseJson('```json\n{"a":1}\n```', {})).toEqual({ a: 1 });
    expect(parseJson('```\n{"a":1}\n```', {})).toEqual({ a: 1 });
  });

  it('returns the fallback rather than throwing on prose', () => {
    const fallback = { subject: 'unset' };
    expect(parseJson('I am afraid I cannot do that.', fallback)).toBe(fallback);
  });

  it('returns the fallback on an empty string and on truncated JSON', () => {
    expect(parseJson('', null)).toBeNull();
    expect(parseJson('{"a": 1', null)).toBeNull();
  });
});
