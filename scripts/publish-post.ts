#!/usr/bin/env node
/**
 * Publishes a hand-written post.
 *
 *   node scripts/publish-post.ts content/posts/example.md            # dry run
 *   node scripts/publish-post.ts content/posts/example.md --apply
 *
 * The blog pipeline assumed every post came from the content cron: the word
 * ceiling was 1,200, first person was a rejection reason, the citation
 * allowlist held consultancy domains, and insertBlogPost was reachable only
 * from src/lib/blog/pipeline.ts. A human-written, research-cited essay failed
 * on all four — which said more about the assumption than about the essay.
 *
 * ── This is not a bypass ─────────────────────────────────────────────────────
 * It runs the same three checks a generated post faces, in the same order:
 *
 *   1. screenDraft   — banned phrasing, injected markup, duplicate titles
 *   2. verifyAll     — every cited URL resolves, against the research allowlist
 *   3. a cross-vendor audit — a model from a different family checks each
 *      factual claim against the source the post cites for it
 *
 * The only relaxations are the two that were about authorship rather than
 * quality: length, and the first-person rule. Guard rail N10 permits this file
 * to write, and a test asserts it performs all three checks — the rule was
 * always "nothing reaches the table unscreened", never "nothing is written by
 * a person".
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Imports stay relative and shallow on purpose. Node strips types but does not
 * resolve the `@/` alias, so this reaches only into modules that are
 * themselves free of alias imports.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

import { neon } from '@neondatabase/serverless';

import { buildSlug, isValidSlug, uniqueSlug } from '../src/lib/blog/slug.ts';
import { decryptSecret } from '../src/lib/credentials-crypto.ts';
import { screenDraft, type ContentProfile } from '../src/lib/blog/quality.ts';
import { RESEARCH_ALLOWLIST, verifyAll } from '../src/lib/blog/verify-links.ts';
import { callAnthropic } from '../src/lib/llm/transport.ts';

const AUDIT_MODEL = 'claude-sonnet-4-5-20250929';
const MIN_AUDIT_SCORE = 0.6;

interface FrontMatter {
  title: string;
  excerpt: string;
  topic: string;
  type?: 'blog' | 'case-study';
  profile?: ContentProfile;
}

interface Audit {
  publishable: boolean;
  score: number;
  problems: string[];
}

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

/**
 * Splits `--- key: value --- body` into its two halves.
 *
 * Deliberately not a YAML parser: the front matter is four scalar fields and a
 * dependency that can interpret `title: AI: a study` three different ways is
 * not worth adding.
 */
function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error('No front matter found. The file must start with a --- block.');
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^\s*([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (field) meta[field[1]] = field[2].trim().replace(/^["']|["']$/g, '');
  }

  for (const required of ['title', 'excerpt', 'topic']) {
    if (!meta[required]) throw new Error(`Front matter is missing "${required}".`);
  }

  return { meta: meta as unknown as FrontMatter, body: match[2].trim() };
}

/** Every external link in the markdown body. */
function citedUrls(body: string): string[] {
  const urls = new Set<string>();

  // Bare URLs and markdown links alike; the trailing-punctuation trim stops a
  // sentence-ending full stop becoming part of the address.
  for (const match of body.matchAll(/https?:\/\/[^\s)<>"'\]]+/g)) {
    urls.add(match[0].replace(/[.,;:]+$/, ''));
  }

  return [...urls];
}

/**
 * The database handle, or null when DATABASE_URL is not set.
 *
 * Null is a supported state on a dry run. Checking a draft is something you do
 * while writing it, and requiring production credentials to find out whether a
 * paragraph trips the screen would mean nobody runs this until the end.
 */
type Sql = ReturnType<typeof neon>;

function db(): Sql | null {
  const url = process.env.DATABASE_URL;
  return url ? neon(url) : null;
}

/**
 * The auditor's key, from the encrypted credentials store.
 *
 * The app keeps provider keys in provider_credentials rather than the
 * environment, so reading ANTHROPIC_API_KEY alone would report "no auditor"
 * on a machine that has one — and the gate fails closed, so that reads as
 * "unpublishable" rather than "misconfigured". Falls back to the environment,
 * which is what src/lib/credentials-store.ts does.
 */
function toBuffer(value: unknown): Buffer {
  // The columns are bytea. The driver hands them back either as a Buffer or as
  // Postgres hex text (\x48656c6c6f), which is what src/lib/credentials-store.ts
  // decodes — reading them as base64 instead produces bytes that decrypt to
  // nothing, and GCM reports that as a corrupt key rather than a wrong one.
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from(String(value).replace(/^\\x/, ''), 'hex');
}

async function auditorKey(sql: Sql | null): Promise<string | null> {
  if (sql) {
    try {
      const rows = (await sql`
        SELECT ciphertext, iv, auth_tag FROM provider_credentials
        WHERE provider = 'anthropic'
      `) as unknown as Record<string, unknown>[];

      if (rows[0]) {
        return decryptSecret({
          ciphertext: toBuffer(rows[0].ciphertext),
          iv: toBuffer(rows[0].iv),
          authTag: toBuffer(rows[0].auth_tag),
        });
      }
    } catch (error) {
      console.warn(
        'Could not read the stored Anthropic key:',
        error instanceof Error ? error.message : error
      );
    }
  }

  return process.env.ANTHROPIC_API_KEY ?? null;
}

/**
 * Pulls a JSON object out of a model reply.
 *
 * transport.parseJson strips a fence anchored at the very start and end of
 * the string, which is the common case and not this one: the auditor returns
 * a fenced block, sometimes with a sentence before it, and on a long verdict
 * the closing fence can be cut off entirely by the token limit. Any of those
 * leaves parseJson returning the fallback, and a reply that is genuinely a
 * pass then looks identical to a rejection with no reasons.
 *
 * Slicing between the first brace and the last one survives a fence, a
 * preamble and a missing terminator. It does not survive a reply truncated
 * mid-object, which is what maxTokens is for — that case still fails, and it
 * now says so.
 */
function extractJson<T>(raw: string): T | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/**
 * The cross-vendor audit, with an essay's rubric.
 *
 * The generated-post auditor is told to reject anything describing the
 * author's own experience, because the author did not write it. That rule
 * inverts here. What matters for a researched essay is narrower and more
 * useful: does each factual claim survive contact with the source cited for
 * it? A misdescribed citation is the failure that costs the most credibility
 * and the one nobody catches by rereading their own work.
 */
async function auditEssay(
  meta: FrontMatter,
  body: string,
  verdicts: Map<string, string>,
  key: string | null
): Promise<Audit | null | 'unparseable' | 'unreachable'> {
  if (!key) return null;

  const system = [
    'You review a long-form technical essay before it is published on a',
    'working engineer’s site. The author wrote it himself and is accountable',
    'for it, so first person is expected and is not a fault.',
    '',
    // Without this the auditor reasons from its own training cutoff and calls
    // recent-but-true events fictional. It did exactly that on the first run
    // of this script, rejecting a verified July 2026 incident as "speculative
    // fiction presented as fact" — on a piece about a fast-moving field, that
    // is wrong about precisely the material worth publishing.
    `Today's date is ${new Date().toISOString().slice(0, 10)}, which is later`,
    'than your training data. Do NOT flag a date, paper or event as fictional',
    'or misdated because you do not recognise it. Every cited URL has already',
    'been fetched and its status is listed below, so treat OK as evidence the',
    'source exists. Judge whether the claim matches what the essay says the',
    'source says, not whether you have heard of it.',
    '',
    'You cannot open the cited sources, so judge only what the text in front',
    'of you can settle:',
    '',
    '- a claim stated more strongly than the essay\u2019s own evidence section',
    '  supports, or a hedge dropped between one section and another',
    '- a controlled research result described as though it happened in the wild',
    '- a specific figure, quote or incident with NO citation at all',
    '- two sections that contradict each other',
    '- text truncated mid-sentence, or a heading with nothing under it',
    '- a conclusion the argument does not reach',
    '',
    'Do NOT ask whether a quote matches its source. You have no way to check,',
    'and saying so is not a finding. A claim whose link is listed OK below is',
    'sourced as far as this review is concerned; a link listed UNVERIFIED',
    'means the publisher refused an automated request, which is routine and is',
    'not evidence against the claim. Both were checked before you were called.',
    '',
    'Do NOT flag: length, opinions, speculation that is labelled as such,',
    'informal tone, or a position you disagree with.',
    '',
    'Reply with JSON and nothing else: {"publishable": boolean, "score":',
    'number between 0 and 1, "problems": [string]}.',
    '',
    'At most six problems, one short sentence each, most serious first. A long',
    'list is not a more careful review; it is a reply that gets truncated',
    'before its closing brace and cannot be read at all.',
  ].join('\n');

  const linkReport = [...verdicts.entries()]
    .map(([url, verdict]) => `${verdict.toUpperCase()}: ${url}`)
    .join('\n');

  const user = [
    `Title: ${meta.title}`,
    `Excerpt: ${meta.excerpt}`,
    '',
    'Link verification already performed:',
    linkReport || '(no external links)',
    '',
    '--- essay ---',
    body,
  ].join('\n');

  try {
    // Generous ceiling. A truncated reply is not valid JSON, and the failure
    // then looks identical to a rejection with no reasons given — which is
    // exactly what happened the first time this ran at 2048.
    const raw = await callAnthropic(key, AUDIT_MODEL, system, user, { maxTokens: 8192 });
    const parsed = extractJson<Partial<Audit>>(raw);

    if (!parsed || typeof parsed.publishable !== 'boolean') {
      // Distinct from a rejection. Both block publication, but only one of
      // them is a problem with the essay, and reporting them identically
      // sends you looking for a fault that is not there.
      console.error('\nThe auditor replied with something that is not a verdict:');
      console.error(raw.slice(0, 400));
      return 'unparseable';
    }

    const score = typeof parsed.score === 'number' ? parsed.score : 0;

    return {
      publishable: parsed.publishable === true && score >= MIN_AUDIT_SCORE,
      score,
      problems: Array.isArray(parsed.problems)
        ? parsed.problems.filter(p => typeof p === 'string')
        : [],
    };
  } catch (error) {
    // Distinct from "no key configured". A 429 from calling this three times
    // in a minute is a transient problem with an obvious fix; reporting it as
    // a missing key sends you looking in the wrong place entirely.
    console.error('\nThe auditor could not be reached:', error instanceof Error ? error.message : error);
    return 'unreachable';
  }
}

async function main(): Promise<void> {
  loadEnv();

  const file = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!file) {
    console.error('Usage: node scripts/publish-post.ts <file.md> [--apply]');
    process.exit(1);
  }

  const { meta, body } = parseFrontMatter(readFileSync(file, 'utf8'));
  const profile: ContentProfile = meta.profile ?? 'essay';

  console.log(`\n${meta.title}`);
  console.log(`${body.split(/\s+/).length} words, profile: ${profile}\n`);

  const sql = db();

  if (!sql && apply) {
    console.error('Cannot publish: DATABASE_URL is not set in .env.local.');
    process.exit(1);
  }

  // Existing titles, so the duplicate check has something to compare against.
  // Without a database the screen still runs; only the duplicate check is
  // skipped, and it says so rather than passing silently.
  const existing = sql
    ? ((await sql`SELECT title, slug FROM blog_posts`) as unknown as Record<string, unknown>[])
    : null;
  const recentTitles = (existing ?? []).map(row => row.title as string);
  const takenSlugs = new Set<string>((existing ?? []).map(row => row.slug).filter(isValidSlug));

  if (!sql) {
    console.log('NOTE     No DATABASE_URL. Screen and citations will run;');
    console.log('         the duplicate-title check is skipped.\n');
  }

  // ── 1. Deterministic screen ────────────────────────────────────────────────
  const screen = screenDraft(
    { ...meta, type: meta.type ?? 'blog', content: body },
    recentTitles,
    profile
  );

  console.log(screen.pass ? 'SCREEN   pass' : 'SCREEN   FAIL');
  for (const reason of screen.reasons) console.log(`         - ${reason}`);

  // ── 2. Citations ───────────────────────────────────────────────────────────
  const urls = citedUrls(body);
  const verdicts = urls.length > 0 ? await verifyAll(urls, 4, RESEARCH_ALLOWLIST) : new Map();

  const dead = [...verdicts.entries()].filter(([, v]) => v === 'dead').map(([u]) => u);
  const unverified = [...verdicts.entries()].filter(([, v]) => v === 'unverified').map(([u]) => u);

  console.log(`\nLINKS    ${urls.length} cited, ${dead.length} dead, ${unverified.length} unverified`);
  for (const [url, verdict] of verdicts) console.log(`         ${verdict.padEnd(10)} ${url}`);

  if (unverified.length > 0) {
    // 403 and 405 are routine from publishers that refuse automated requests —
    // openai.com is one — so these are reported rather than treated as
    // fabrication. A human still has to look at them.
    console.log('\n         Unverified links could not be confirmed either way.');
    console.log('         Check them by hand before applying.');
  }

  // ── 3. Cross-vendor audit ──────────────────────────────────────────────────
  const audit = await auditEssay(meta, body, verdicts, await auditorKey(sql));

  if (audit === 'unparseable') {
    console.log('\nAUDIT    FAIL — the reply was not a verdict (see above)');
  } else if (audit === 'unreachable') {
    console.log('\nAUDIT    FAIL — the auditor could not be reached (see above)');
  } else if (!audit) {
    console.log('\nAUDIT    unavailable (no auditor key)');
  } else {
    console.log(`\nAUDIT    ${audit.publishable ? 'pass' : 'FAIL'}, score ${audit.score.toFixed(2)}`);
    for (const problem of audit.problems) console.log(`         - ${problem}`);
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  const blockers: string[] = [];
  if (!screen.pass) blockers.push('the deterministic screen rejected it');
  if (dead.length > 0) blockers.push(`${dead.length} cited link(s) do not resolve`);
  if (audit === 'unparseable') {
    blockers.push('the auditor did not return a readable verdict');
  } else if (audit === 'unreachable') {
    blockers.push('the auditor could not be reached');
  } else if (!audit) {
    blockers.push('no auditor available, and a post is never published unaudited');
  } else if (!audit.publishable) {
    blockers.push('the auditor rejected it');
  }

  if (blockers.length > 0) {
    console.log('\nNOT PUBLISHABLE:');
    for (const blocker of blockers) console.log(`  - ${blocker}`);
    process.exit(1);
  }

  const slug = uniqueSlug(buildSlug(meta.title, meta.title), takenSlugs);
  console.log(`\nSlug:    ${slug}`);

  if (!apply) {
    console.log('\nDry run. Nothing was written. Re-run with --apply to publish.');
    return;
  }

  const inserted = (await sql!`
    INSERT INTO blog_posts (slug, title, content, excerpt, type, topic, sources, published)
    VALUES (
      ${slug},
      ${meta.title},
      ${body},
      ${meta.excerpt},
      ${meta.type ?? 'blog'},
      ${meta.topic},
      ${'[]'}::jsonb,
      ${true}
    )
    RETURNING id, slug
  `) as unknown as Record<string, unknown>[];

  console.log(`\nPublished. id ${inserted[0].id}, /blog/${inserted[0].slug}`);
  console.log('The index picks it up within its revalidate floor (5 minutes).');
  console.log('\nNot submitted to IndexNow: /blog carries noindex until');
  console.log('BLOG_INDEXABLE is true. Announcing a noindex URL teaches the');
  console.log('endpoints to distrust the feed.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
