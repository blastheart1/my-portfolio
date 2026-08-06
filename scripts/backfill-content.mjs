/**
 * Backfill hardcoded content into the database.
 *
 * Two jobs, both idempotent — safe to run more than once.
 *
 * 1. PROJECTS
 *    ProjectsSection.tsx falls back to a hardcoded FALLBACK_PROJECTS array
 *    whenever the projects table returns zero rows. The public site has always
 *    rendered that array, so /edit/projects managed an empty table nobody saw.
 *
 *    That is also a trap: add your first project through the admin and the
 *    count goes 0 -> 1, the fallback condition flips, and all nine hardcoded
 *    projects vanish at once. Seeding the table removes the trap and makes the
 *    admin the real source of truth.
 *
 * 2. PROFILE PHOTO PATHS
 *    section_content stores /profile-photo2.png, which was replaced by
 *    /profile-photo2.webp during the image optimisation pass (2 MB -> 173 KB).
 *    The old file no longer exists, so those rows now point at a 404. This
 *    must run before deploying that change, or production breaks the same way
 *    local did.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-content.mjs [--dry-run]
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');

const PROJECTS_SECTION = path.resolve(
  import.meta.dirname,
  '../src/components/ProjectsSection.tsx'
);

/**
 * Read FALLBACK_PROJECTS straight out of the component.
 *
 * Transcribing six objects with paragraph-length descriptions by hand invites
 * silent drift and typos. Parsing the source guarantees what lands in the
 * database is exactly what the site has been rendering.
 */
function readFallbackProjects() {
  const src = readFileSync(PROJECTS_SECTION, 'utf8');
  const match = src.match(/const FALLBACK_PROJECTS[^=]*=\s*(\[[\s\S]*?\n\]);/);

  if (!match) {
    throw new Error(
      `Could not find FALLBACK_PROJECTS in ${PROJECTS_SECTION}. ` +
        'If it has already been deleted, the projects backfill is done — ' +
        'remove that step from this script.'
    );
  }

  // The literal contains only strings and arrays of strings.
  const projects = new Function(`return ${match[1]}`)();
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('FALLBACK_PROJECTS parsed but was not a non-empty array');
  }
  return projects;
}

const PHOTO_REWRITES = [
  { from: '/profile-photo2.png', to: '/profile-photo2.webp' },
];

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local ...');
    process.exit(1);
  }
  return url;
}

async function backfillProjects(sql) {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM projects`;

  if (count > 0) {
    console.log(`  projects: ${count} row(s) already present — skipping`);
    return;
  }

  const projects = readFallbackProjects();
  console.log(`  projects: table is empty, seeding ${projects.length} row(s)`);
  if (DRY_RUN) {
    for (const p of projects) console.log(`    + ${p.title}`);
    return;
  }

  for (const [i, p] of projects.entries()) {
    await sql`
      INSERT INTO projects (title, description, tech, link, sort_order, visible)
      VALUES (${p.title}, ${p.description}, ${p.tech ?? []}, ${p.link ?? null}, ${i}, true)
    `;
    console.log(`    + ${p.title}`);
  }
}

async function rewritePhotoPaths(sql) {
  for (const { from, to } of PHOTO_REWRITES) {
    const rows = await sql`
      SELECT section_id, field_key FROM section_content WHERE field_value = ${from}
    `;

    if (rows.length === 0) {
      console.log(`  photos: no rows point at ${from} — nothing to do`);
      continue;
    }

    console.log(`  photos: ${rows.length} row(s) pointing at ${from}`);
    for (const r of rows) console.log(`    ${r.section_id}.${r.field_key} -> ${to}`);
    if (DRY_RUN) continue;

    await sql`
      UPDATE section_content SET field_value = ${to} WHERE field_value = ${from}
    `;
  }
}

async function main() {
  const sql = neon(requireDatabaseUrl());

  console.log(DRY_RUN ? 'DRY RUN — no writes\n' : 'Backfilling…\n');
  await backfillProjects(sql);
  await rewritePhotoPaths(sql);
  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nBackfill failed:', err.message);
  process.exit(1);
});
