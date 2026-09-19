#!/usr/bin/env node
/**
 * Fills blog_posts.slug for rows that predate the column.
 *
 *   node scripts/backfill-blog-slugs.ts            # prints the plan, writes nothing
 *   node scripts/backfill-blog-slugs.ts --apply    # writes
 *
 * Step 2 of scripts/migrations/supabase/002_blog_slug.sql. Run it after step 1
 * has added the nullable column and before step 3 constrains it.
 *
 * It imports buildSlug and uniqueSlug from the application rather than
 * reimplementing them in SQL. That is the whole point: the slug rules (accent
 * folding, the id-derived fallback for an emoji-only title, the -2/-3
 * disambiguation) are unit-tested in one place, and a second implementation
 * would be free to disagree with the first. A disagreement here is a duplicate
 * URL or a 404.
 *
 * This is the only writer of an existing row's slug in the codebase, and it
 * only ever fills a blank one — it will not overwrite a slug a row already
 * has. Guard rail N16 forbids rewriting one from application code; a row that
 * has never had a URL is not covered by that, because there is nothing
 * pointing at it yet.
 *
 * Dry run by default, because DATABASE writes here are against production.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { buildSlug, isValidSlug, uniqueSlug } from '../src/lib/blog/slug.ts';

interface Row {
  id: string;
  title: string;
  slug: string | null;
  created_at: string;
  published: boolean;
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

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local.');
    process.exit(1);
  }

  if (!serviceKey) {
    // Worth saying plainly: if this works with the anon key, RLS is not
    // restricting writes, which is the problem 001_blog_rls.sql addresses.
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key.\n' +
        'If the writes below succeed with it, anonymous writes are open and\n' +
        'scripts/migrations/supabase/001_blog_rls.sql has not been applied.\n'
    );
  }

  const key = serviceKey ?? anonKey;
  if (!key) {
    console.error('No Supabase key available. Set SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function main(): Promise<void> {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const db = client();

  const { data, error } = await db
    .from('blog_posts')
    .select('id, title, slug, created_at, published')
    // Oldest first, so suffixes are assigned in publication order and a rerun
    // produces the same answer.
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Could not read blog_posts:', error.message);
    if (error.message.includes('slug')) {
      console.error('\nThe slug column does not exist yet. Run step 1 of');
      console.error('scripts/migrations/supabase/002_blog_slug.sql first.');
    }
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    console.log('No rows in blog_posts. Nothing to do.');
    return;
  }

  // Slugs already assigned are reserved before anything new is computed, so a
  // backfill can be rerun safely and cannot collide with earlier work.
  const taken = new Set<string>(rows.map(row => row.slug).filter(isValidSlug));

  const plan = rows
    .filter(row => !isValidSlug(row.slug))
    .map(row => {
      const slug = uniqueSlug(buildSlug(row.title, row.id), taken);
      taken.add(slug);
      return { row, slug };
    });

  console.log(`${rows.length} rows, ${rows.length - plan.length} already slugged.`);

  if (plan.length === 0) {
    console.log('Every row has a slug. Step 3 of the migration is safe to run.');
    return;
  }

  console.log(`\n${plan.length} to fill:\n`);
  for (const { row, slug } of plan) {
    const state = row.published ? 'published' : 'draft    ';
    console.log(`  ${state}  ${slug}`);
    console.log(`             from: ${row.title}`);
  }

  if (!apply) {
    console.log('\nDry run. Nothing was written. Re-run with --apply to write.');
    return;
  }

  console.log('\nWriting...\n');
  let written = 0;
  const failures: string[] = [];

  for (const { row, slug } of plan) {
    // Guarded on slug being null so a concurrent run cannot overwrite a slug
    // assigned between the read above and this write.
    const { error: updateError } = await db
      .from('blog_posts')
      .update({ slug })
      .eq('id', row.id)
      .is('slug', null);

    if (updateError) {
      failures.push(`${row.id}: ${updateError.message}`);
    } else {
      written += 1;
    }
  }

  console.log(`Wrote ${written} of ${plan.length}.`);

  if (failures.length > 0) {
    console.error('\nFailed:');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log('\nVerify before running step 3 of the migration:');
  console.log('  select count(*) from blog_posts where slug is null;   -- expect 0');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
