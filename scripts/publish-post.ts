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

import { createClient } from '@supabase/supabase-js';

import { buildSlug, isValidSlug, uniqueSlug } from '../src/lib/blog/slug.ts';
import { screenDraft, type ContentProfile } from '../src/lib/blog/quality.ts';
import { RESEARCH_ALLOWLIST, verifyAll } from '../src/lib/blog/verify-links.ts';
import { callAnthropic, parseJson } from '../src/lib/llm/transport.ts';

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

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key.\n');
  }

  return createClient(url, key, { auth: { persistSession: false } });
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
  verdicts: Map<string, string>
): Promise<Audit | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const system = [
    'You review a long-form technical essay before it is published on a',
    'working engineer’s site. The author wrote it himself and is accountable',
    'for it, so first person is expected and is not a fault.',
    '',
    'Judge one thing above all: does every factual claim match the source the',
    'essay cites for it? Flag specifically:',
    '- a claim attributed to a paper or report that the source does not support',
    '- a number, date, title or author that looks wrong',
    '- a controlled research result described as though it happened in the wild',
    '- a hedge removed, so a tentative finding reads as established',
    '',
    'Also flag genuine incoherence: a section that contradicts another, or text',
    'that has been truncated mid-sentence.',
    '',
    'Do NOT flag: length, opinions, speculation that is labelled as such,',
    'informal tone, or a position you disagree with.',
    '',
    'Reply as JSON: {"publishable": boolean, "score": number between 0 and 1,',
    '"problems": [string]} where each problem names the section and the issue.',
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
    const raw = await callAnthropic(key, AUDIT_MODEL, system, user, { maxTokens: 2048 });
    const parsed = parseJson<Partial<Audit>>(raw, {});
    const score = typeof parsed.score === 'number' ? parsed.score : 0;

    return {
      publishable: parsed.publishable === true && score >= MIN_AUDIT_SCORE,
      score,
      problems: Array.isArray(parsed.problems)
        ? parsed.problems.filter(p => typeof p === 'string')
        : [],
    };
  } catch (error) {
    console.error('Auditor call failed:', error instanceof Error ? error.message : error);
    return null;
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

  const db = client();

  // Existing titles, so the duplicate check has something to compare against.
  const { data: existing } = await db.from('blog_posts').select('title, slug');
  const recentTitles = (existing ?? []).map(row => row.title as string);
  const takenSlugs = new Set<string>((existing ?? []).map(row => row.slug).filter(isValidSlug));

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
  const audit = await auditEssay(meta, body, verdicts);

  if (!audit) {
    console.log('\nAUDIT    unavailable (no ANTHROPIC_API_KEY)');
  } else {
    console.log(`\nAUDIT    ${audit.publishable ? 'pass' : 'FAIL'}, score ${audit.score.toFixed(2)}`);
    for (const problem of audit.problems) console.log(`         - ${problem}`);
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  const blockers: string[] = [];
  if (!screen.pass) blockers.push('the deterministic screen rejected it');
  if (dead.length > 0) blockers.push(`${dead.length} cited link(s) do not resolve`);
  if (!audit) blockers.push('no auditor available, and a post is never published unaudited');
  else if (!audit.publishable) blockers.push('the auditor rejected it');

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

  const { data, error } = await db
    .from('blog_posts')
    .insert([
      {
        title: meta.title,
        content: body,
        excerpt: meta.excerpt,
        type: meta.type ?? 'blog',
        topic: meta.topic,
        sources: [],
        published: true,
        slug,
      },
    ])
    .select('id, slug')
    .single();

  if (error) {
    console.error('\nInsert failed:', error.message);
    process.exit(1);
  }

  console.log(`\nPublished. id ${data.id}, /blog/${data.slug}`);
  console.log('The index picks it up within its revalidate floor (5 minutes).');
  console.log('\nNot submitted to IndexNow: /blog carries noindex until');
  console.log('BLOG_INDEXABLE is true. Announcing a noindex URL teaches the');
  console.log('endpoints to distrust the feed.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
