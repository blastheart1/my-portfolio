/**
 * seed-neon.ts
 * Runs the full migration + seed against DATABASE_URL.
 * Usage: npx tsx scripts/seed-neon.ts
 *
 * Requires DATABASE_URL in .env.local or environment.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Add it to .env.local first.');
  process.exit(1);
}

import { Pool } from '@neondatabase/serverless';

async function main() {
  const sqlFile = path.resolve(process.cwd(), 'scripts/migrate-neon.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('❌  scripts/migrate-neon.sql not found.');
    process.exit(1);
  }

  const migration = fs.readFileSync(sqlFile, 'utf8');

  // Split on semicolons, skip comments and blank lines
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/));

  const pool = new Pool({ connectionString: DATABASE_URL });

  console.log(`🚀  Running migration (${statements.length} statements)…\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 60);
    try {
      await pool.query(stmt);
      console.log(`  ✓ [${i + 1}/${statements.length}] ${preview}…`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [${i + 1}/${statements.length}] ${preview}…`);
      console.error(`       ${msg}`);
      // Don't abort — many statements are idempotent and may warn on re-run
    }
  }

  await pool.end();

  console.log('\n✅  Migration complete.\n');
  console.log('Next steps:');
  console.log('  1. Generate password hash:');
  console.log(`     node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD',12).then(h=>console.log(h))"`);
  console.log('  2. Add ADMIN_PASSWORD_HASH and JWT_SECRET to .env.local');
  console.log('  3. Run: npm run dev -- --port 3007');
  console.log('  4. Visit http://localhost:3007/edit/login');
}

main().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
