/**
 * pipeline.test.ts
 *
 * Guard rails:
 *   N10 — no post may be inserted without passing the gate; insertBlogPost is
 *         callable only from src/lib/blog/pipeline.ts
 *   N11 — a post may never be published unaudited; a missing auditor key
 *         rejects rather than publishes
 *
 * N11 is the one to read carefully. The relay pipeline this is modelled on
 * degrades to "unaudited" when the auditor key is absent, which is right for a
 * demo and catastrophic here: the gate would keep reporting success while
 * checking nothing. Several tests below exist only to make that inversion
 * impossible to reintroduce quietly.
 *
 * "insertBlogPost was never called" is the single highest-value assertion in
 * the suite. Everything else is a reason; that is the consequence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const generateContent = vi.fn();
const insertBlogPost = vi.fn();
const getAssignedSlugs = vi.fn();
const getProviderKey = vi.fn();

vi.mock('@/lib/openai-service', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/openai-service')>()),
  generateContent: (req: unknown) => generateContent(req),
}));

vi.mock('@/lib/database', () => ({
  insertBlogPost: (post: unknown) => insertBlogPost(post),
  getAssignedSlugs: () => getAssignedSlugs(),
}));

vi.mock('@/lib/credentials-store', () => ({
  getProviderKey: (provider: string) => getProviderKey(provider),
}));

import { runContentPipeline } from '../pipeline';

const SRC = path.resolve(__dirname, '../../..');
const AWS = 'https://aws.amazon.com/solutions/case-studies/example';

const fetchMock = vi.fn();

/** Prose long enough to clear the word floor and trip nothing. */
function body(words = 400): string {
  const sentence = 'Deterministic rules remain auditable while model calls absorb unstructured input. ';
  return sentence.repeat(Math.ceil(words / 11)).split(/\s+/).slice(0, words).join(' ');
}

function generated(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Choosing Between Deterministic Rules And Model Calls',
    excerpt:
      'Some decisions belong in rules an auditor can read, and some genuinely need a language model. Getting that split wrong is why automation projects get switched off.',
    content: body(),
    caseStudyLink: null,
    ...overrides,
  };
}

/** An auditor reply, as Anthropic would return it. */
function auditReply(verdict: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ text: JSON.stringify(verdict) }] }),
  };
}

const PASSING_AUDIT = { publishable: true, score: 0.9, problems: [] };

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);

  getProviderKey.mockResolvedValue('sk-ant-test');
  getAssignedSlugs.mockResolvedValue(new Set<string>());
  insertBlogPost.mockResolvedValue({ id: 'row-1' });
  generateContent.mockResolvedValue(generated());
  // Default: the auditor approves. Link checks share this mock and answer 200.
  fetchMock.mockResolvedValue(auditReply(PASSING_AUDIT));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function run(overrides: Record<string, unknown> = {}) {
  return runContentPipeline({
    topic: 'Decision Automation',
    type: 'blog',
    previousContent: [],
    ...overrides,
  });
}

describe('the happy path', () => {
  it('publishes a draft that passes every check', async () => {
    const outcome = await run();

    expect(outcome.published).toBe(true);
    expect(outcome.attempts).toBe(1);
    expect(insertBlogPost).toHaveBeenCalledTimes(1);
  });

  it('assigns a slug derived from the title, and publishes it', async () => {
    const outcome = await run();

    expect(outcome.slug).toBe('choosing-between-deterministic-rules-and-model-calls');
    expect(insertBlogPost.mock.calls[0][0]).toMatchObject({
      slug: 'choosing-between-deterministic-rules-and-model-calls',
      published: true,
    });
  });

  it('disambiguates against slugs already assigned', async () => {
    getAssignedSlugs.mockResolvedValue(
      new Set(['choosing-between-deterministic-rules-and-model-calls'])
    );

    const outcome = await run();

    expect(outcome.slug).toBe('choosing-between-deterministic-rules-and-model-calls-2');
  });

  it('returns the inserted row id', async () => {
    insertBlogPost.mockResolvedValue({ id: 'row-42' });
    await expect(run()).resolves.toMatchObject({ id: 'row-42' });
  });
});

describe('N11 — never publishes unaudited', () => {
  it('rejects when no auditor key is configured', async () => {
    getProviderKey.mockResolvedValue(null);

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(outcome.reasons.join(' ')).toMatch(/no auditor available/);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('does not burn a second attempt when the auditor is simply absent', async () => {
    // The key will still be missing on the retry; spending another generation
    // on it costs money to reach the same answer.
    getProviderKey.mockResolvedValue(null);

    await run();

    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('rejects when the auditor call fails outright', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('rejects when the auditor reply cannot be parsed', async () => {
    // A malformed audit must not default to publishable. This is precisely
    // how a gate turns into a no-op that still reports success.
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: 'I am unable to assess this.' }] }),
    });

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('rejects a draft the auditor scores below the threshold, even if it says publishable', async () => {
    fetchMock.mockResolvedValue(
      auditReply({ publishable: true, score: 0.2, problems: ['fluent but empty'] })
    );

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(outcome.reasons).toContain('fluent but empty');
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('asks a different vendor than the one that wrote the draft', async () => {
    await run();

    expect(getProviderKey).toHaveBeenCalledWith('anthropic');
    const audited = fetchMock.mock.calls.some(([url]) =>
      String(url).includes('api.anthropic.com')
    );
    expect(audited).toBe(true);
  });
});

describe('the repair pass', () => {
  it('rewrites once, telling the model exactly what was wrong', async () => {
    generateContent
      .mockResolvedValueOnce(generated({ content: `${body(380)} TODO: expand this.` }))
      .mockResolvedValueOnce(generated());

    const outcome = await run();

    expect(outcome.published).toBe(true);
    expect(outcome.attempts).toBe(2);
    expect(generateContent).toHaveBeenCalledTimes(2);

    const secondCall = generateContent.mock.calls[1][0];
    expect(secondCall.revisionNotes.join(' ')).toMatch(/unfinished marker/);
  });

  it('sends no revision notes on the first attempt', async () => {
    await run();
    expect(generateContent.mock.calls[0][0].revisionNotes).toEqual([]);
  });

  it('stops after two attempts rather than looping', async () => {
    generateContent.mockResolvedValue(generated({ content: body(30) }));

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(outcome.attempts).toBe(2);
    expect(outcome.reasons.join(' ')).toMatch(/after 2 attempts/);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });
});

describe('the deterministic screen is actually applied', () => {
  it('rejects a draft carrying the old fallback disclaimer', async () => {
    generateContent.mockResolvedValue(
      generated({ content: `${body(380)} 🔎 No relevant case study available from trusted sources.` })
    );

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('rejects a near-duplicate of a recent post', async () => {
    const outcome = await run({
      previousContent: [
        { title: 'Choosing Between Deterministic Rules And Model Calls' },
      ] as never,
    });

    expect(outcome.published).toBe(false);
    expect(outcome.reasons.join(' ')).toMatch(/near-duplicate/);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('rejects a schema-invalid draft without calling the auditor', async () => {
    generateContent.mockResolvedValue(generated({ title: 'Short' }));

    const outcome = await run();

    expect(outcome.published).toBe(false);
    // Cheap checks first: no provider budget spent auditing a truncated reply.
    expect(getProviderKey).not.toHaveBeenCalled();
  });
});

describe('source links', () => {
  it('rejects a case study whose source does not resolve', async () => {
    generateContent.mockResolvedValue(generated({ caseStudyLink: AWS }));
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('aws.amazon.com')
        ? { ok: false, status: 404 }
        : auditReply(PASSING_AUDIT)
    );

    const outcome = await run({ type: 'case-study' });

    expect(outcome.published).toBe(false);
    expect(outcome.reasons.join(' ')).toMatch(/does not resolve/);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });

  it('downgrades to a blog post when the source cannot be confirmed', async () => {
    // 403 from a CDN is routine and says nothing about the page existing. The
    // post keeps its substance and drops the claim it cannot support.
    generateContent.mockResolvedValue(generated({ caseStudyLink: AWS }));
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('aws.amazon.com')
        ? { ok: false, status: 403 }
        : auditReply(PASSING_AUDIT)
    );

    const outcome = await run({ type: 'case-study' });

    expect(outcome.published).toBe(true);
    expect(outcome.downgraded).toBe(true);
    expect(insertBlogPost.mock.calls[0][0]).toMatchObject({ type: 'blog' });
    expect(insertBlogPost.mock.calls[0][0].caseStudyLink).toBeUndefined();
  });

  it('publishes a case study whose source resolves, keeping the link', async () => {
    generateContent.mockResolvedValue(generated({ caseStudyLink: AWS }));
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('aws.amazon.com')
        ? { ok: true, status: 200 }
        : auditReply(PASSING_AUDIT)
    );

    const outcome = await run({ type: 'case-study' });

    expect(outcome.published).toBe(true);
    expect(outcome.downgraded).toBe(false);
    expect(insertBlogPost.mock.calls[0][0]).toMatchObject({
      type: 'case-study',
      caseStudyLink: AWS,
    });
  });

  it('rejects a source on a domain nobody vetted', async () => {
    generateContent.mockResolvedValue(
      generated({ sources: [{ title: 'A blog', url: 'https://medium.com/@someone/post' }] })
    );

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(insertBlogPost).not.toHaveBeenCalled();
  });
});

describe('failures that are not the content’s fault', () => {
  it('reports a generation outage without retrying it', async () => {
    generateContent.mockRejectedValue(new Error('OPENAI_API_KEY is not set'));

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(outcome.reasons.join(' ')).toMatch(/generation failed/);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('reports a failed insert rather than throwing', async () => {
    insertBlogPost.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

    const outcome = await run();

    expect(outcome.published).toBe(false);
    expect(outcome.reasons.join(' ')).toMatch(/insert failed/);
  });

  it('never throws, whatever the providers do', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(run()).resolves.toBeDefined();
  });
});

/**
 * N10. The tests above prove the gate rejects; this proves nothing can walk
 * around it.
 */
describe('N10 — insertBlogPost is reachable only through the gate', () => {
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next') continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
  }

  /** The gate itself, and the module that defines the function. */
  const ALLOWED = ['lib/blog/pipeline.ts', 'lib/database.ts'];

  it('no other source file calls it', () => {
    const offenders = walk(SRC)
      .filter(file => !file.includes('__tests__'))
      .filter(file => /\binsertBlogPost\s*\(/.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(SRC, file))
      .filter(rel => !ALLOWED.includes(rel.split(path.sep).join('/')));

    expect(
      offenders,
      'These write to blog_posts without passing the publish gate. Every row ' +
        'now has an indexable URL, so an unscreened insert publishes ' +
        'unreviewed machine-written content to the live site. Route it ' +
        'through runContentPipeline():\n' + offenders.join('\n')
    ).toEqual([]);
  });

  it('both write routes go through the pipeline and propagate the change', () => {
    const routes = [
      'app/api/blog/generate/route.ts',
      'app/api/cron/generate-content/route.ts',
    ];

    for (const rel of routes) {
      const src = readFileSync(path.join(SRC, rel), 'utf8');
      expect(src, `${rel} must use the gate`).toContain('runContentPipeline');
      expect(src, `${rel} must invalidate the pages a post appears on`).toContain(
        'revalidatePath'
      );
      expect(src, `${rel} must tell the search engines`).toContain('submitToIndexNow');
    }
  });
});
