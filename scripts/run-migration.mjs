#!/usr/bin/env node
/**
 * Applies a .sql migration file, once, with the safety rails this repo's
 * history says it needs.
 *
 *   node scripts/run-migration.mjs scripts/migrations/002_demos_and_credentials.sql --dry-run
 *   node scripts/run-migration.mjs scripts/migrations/002_demos_and_credentials.sql --yes
 *
 * Rails:
 *   - Refuses destructive statements outright. Migrations here are expand-only.
 *   - Prints the target host and requires --yes, because DATABASE_URL in
 *     .env.local points at production.
 *   - Records what ran in schema_migrations and skips anything already applied.
 *   - Stops at the first failing statement rather than ploughing on.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { neon } from '@neondatabase/serverless';

const DESTRUCTIVE = /\b(DROP\s+(TABLE|COLUMN|INDEX|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+\S+\s+DROP)\b/i;

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

/**
 * Splits a file into statements.
 *
 * Naive `split(';')` is wrong twice over: a `;` inside a trailing `-- comment`
 * ends a statement early, and a `;` inside a quoted literal does the same. Both
 * produce fragments that fail with a confusing syntax error halfway through a
 * migration. This walks the text tracking quote state and drops comments as it
 * goes, which is the smallest thing that is actually correct.
 */
function statements(sql) {
  const out = [];
  let current = '';
  let inString = false;
  let inComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inComment) {
      if (ch === '\n') {
        inComment = false;
        current += ch;
      }
      continue;
    }

    if (inString) {
      current += ch;
      // '' is an escaped quote inside a string, not a terminator.
      if (ch === "'") {
        if (sql[i + 1] === "'") current += sql[++i];
        else inString = false;
      }
      continue;
    }

    if (ch === '-' && sql[i + 1] === '-') { inComment = true; i++; continue; }
    if (ch === "'") { inString = true; current += ch; continue; }
    if (ch === ';') { out.push(current.trim()); current = ''; continue; }

    current += ch;
  }

  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error('usage: run-migration.mjs <file.sql> [--dry-run] [--yes]');
    process.exit(1);
  }

  const dryRun = flags.includes('--dry-run');
  const confirmed = flags.includes('--yes');

  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const raw = readFileSync(file, 'utf8');
  const parts = statements(raw);
  const name = path.basename(file);
  const checksum = createHash('sha256').update(raw).digest('hex').slice(0, 16);

  // Fail before touching the database, not half-way through.
  const destructive = parts.filter(s => DESTRUCTIVE.test(s));
  if (destructive.length) {
    console.error(`Refusing to run: ${destructive.length} destructive statement(s).`);
    destructive.forEach(s => console.error(`  ${s.split('\n')[0]}…`));
    console.error('Migrations in this repo are expand-only. Apply this by hand if you truly mean it.');
    process.exit(1);
  }

  const host = url.match(/@([^/?]+)/)?.[1] ?? 'unknown host';
  console.log(`file:       ${name} (${checksum})`);
  console.log(`statements: ${parts.length}`);
  console.log(`target:     ${host}`);

  if (dryRun) {
    parts.forEach((s, i) => console.log(`\n-- [${i + 1}]\n${s};`));
    console.log('\nDry run. Nothing was applied.');
    return;
  }

  if (!confirmed) {
    console.error('\nRefusing to apply without --yes. This target is likely production.');
    process.exit(1);
  }

  const sql = neon(url);

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const [existing] = await sql`SELECT checksum FROM schema_migrations WHERE name = ${name}`;
  if (existing) {
    if (existing.checksum !== checksum) {
      console.error(`\n${name} already ran with a different checksum (${existing.checksum}).`);
      console.error('Editing an applied migration is not safe. Write a new file instead.');
      process.exit(1);
    }
    console.log('\nAlready applied. Nothing to do.');
    return;
  }

  for (const [i, statement] of parts.entries()) {
    try {
      await sql.query(statement);
      console.log(`  [${i + 1}/${parts.length}] ok`);
    } catch (err) {
      console.error(`\n  [${i + 1}] FAILED: ${err.message}`);
      console.error('  Stopped. Earlier statements are idempotent, so re-running is safe.');
      process.exit(1);
    }
  }

  await sql`
    INSERT INTO schema_migrations (name, checksum) VALUES (${name}, ${checksum})
    ON CONFLICT (name) DO NOTHING
  `;
  console.log('\nApplied.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
