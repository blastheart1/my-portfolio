#!/usr/bin/env node
/**
 * Holds the existing back catalogue to the same bar as a new post.
 *
 *   node scripts/quarantine-blog.ts            # scores every row, writes nothing
 *   node scripts/quarantine-blog.ts --apply    # unpublishes the failures
 *
 * Run this BEFORE /blog goes live. Every published row is about to acquire an
 * indexable URL, and these rows were written by gpt-3.5-turbo with no
 * validation of any kind — including, in some cases, a prompt that instructed
 * the model to print "🔎 No relevant case study available from trusted
 * sources" into the body when it could not find one.
 *
 * Kept after the move to Neon: the legacy Supabase rows it was written for are
 * not here, but a sweep over published content against the current screen is
 * worth having whenever the rules tighten.
 *
 * It applies the same deterministic screen new posts face
 * (src/lib/blog/quality.ts) plus the same source-link verification
 * (src/lib/blog/verify-links.ts). It does NOT run the model audit: that costs
 * money per row and this is a one-off sweep over content that is already
 * written. The deterministic screen is what catches the disclaimer, the stubs
 * and the dead citations, which is the bulk of it.
 *
 * Failures are set published = false. Nothing is deleted. The ids are printed
 * so reversing a decision is a one-line update:
 *
 *   update blog_posts set published = true where id in ('...');
 *
 * Dry run by default. A bug that unpublished every row would also make
 * getLatestBlogPost() return null, which tells the content cron it is overdue
 * and should generate immediately — so a mistake here does not sit still.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { neon } from '@neondatabase/serverless';

import { screenDraft } from '../src/lib/blog/quality.ts';
import { verifyAll } from '../src/lib/blog/verify-links.ts';

interface Row {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  type: 'blog' | 'case-study';
  topic: string;
  sources: { title: string; url: string }[] | null;
  case_study_link: string | null;
  created_at: string;
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

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set in .env.local.');
    process.exit(1);
  }
  return neon(url);
}

async function main(): Promise<void> {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const sql = db();

  const rows = (await sql`
    SELECT id, title, content, excerpt, type, topic, sources, case_study_link, created_at
    FROM blog_posts
    WHERE published = true
    ORDER BY created_at ASC
  `) as unknown as Row[];
  if (rows.length === 0) {
    console.log('No published rows. Nothing to do.');
    return;
  }

  console.log(`Scoring ${rows.length} published posts.\n`);

  // Every URL across every row, checked once with bounded concurrency rather
  // than row by row — the same citation recurs across posts.
  const allUrls = rows.flatMap(row => [
    ...(row.case_study_link ? [row.case_study_link] : []),
    ...(row.sources ?? []).map(source => source.url),
  ]);
  const verdicts = allUrls.length > 0 ? await verifyAll(allUrls) : new Map();

  const failures: { row: Row; reasons: string[] }[] = [];
  const survivors: Row[] = [];

  // Titles accumulate as we go, so the OLDER of a duplicate pair survives and
  // the later restatement is the one quarantined.
  const seenTitles: string[] = [];

  for (const row of rows) {
    const reasons: string[] = [];

    const screen = screenDraft(
      {
        title: row.title,
        content: row.content,
        excerpt: row.excerpt,
        type: row.type,
        topic: row.topic,
        sources: row.sources ?? undefined,
        caseStudyLink: row.case_study_link,
      },
      seenTitles
    );
    reasons.push(...screen.reasons);

    const cited = [
      ...(row.case_study_link ? [row.case_study_link] : []),
      ...(row.sources ?? []).map(source => source.url),
    ];
    for (const url of cited) {
      if (verdicts.get(url) === 'dead') reasons.push(`cites a source that does not resolve: ${url}`);
    }

    if (reasons.length > 0) {
      failures.push({ row, reasons });
    } else {
      survivors.push(row);
      seenTitles.push(row.title);
    }
  }

  for (const { row, reasons } of failures) {
    console.log(`FAIL  ${row.title}`);
    console.log(`      ${row.id}`);
    for (const reason of reasons) console.log(`      - ${reason}`);
    console.log('');
  }

  console.log(`${survivors.length} pass, ${failures.length} fail.\n`);

  if (survivors.length > 0) {
    console.log('Surviving posts, which are the ones that will get URLs:\n');
    for (const row of survivors) console.log(`  ${row.title}`);
    console.log('');
    console.log('Read these before flipping /blog to indexable. The screen is');
    console.log('deterministic: it proves a post is not obviously broken, not');
    console.log('that it is worth someone’s time.\n');
  }

  if (failures.length === 0) {
    console.log('Nothing to quarantine.');
    return;
  }

  if (!apply) {
    console.log('Dry run. Nothing was written. Re-run with --apply to unpublish the failures.');
    return;
  }

  if (failures.length === rows.length) {
    // Almost certainly a bug in the screen rather than a catalogue that is
    // entirely worthless, and the blast radius is the whole blog.
    console.error('Refusing to unpublish every post. Check the screen first.');
    process.exit(1);
  }

  console.log('Unpublishing...\n');
  const ids = failures.map(failure => failure.row.id);
  await sql`UPDATE blog_posts SET published = false WHERE id = ANY(${ids}::uuid[])`;

  console.log(`Unpublished ${ids.length}.\n`);
  console.log('To reverse:');
  console.log(`  update blog_posts set published = true where id in (${ids.map(id => `'${id}'`).join(', ')});`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
