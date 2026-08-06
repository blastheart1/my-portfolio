/**
 * no-public-secrets.test.ts
 *
 * Guard rail N3 — no secret may be read through a NEXT_PUBLIC_* env var.
 *
 * NEXT_PUBLIC_* values are string-inlined into the client bundle at build
 * time, so anything read that way is published to every visitor. This test is
 * a source-level tripwire: it fails the moment someone reintroduces a
 * secret-shaped public env var, which is much cheaper than discovering it in a
 * deployed bundle.
 *
 * Public-by-design values (a site URL, a Supabase anon key, a contact address)
 * are allow-listed explicitly below.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');

/**
 * NEXT_PUBLIC_* names that are safe to expose. Adding to this list is a
 * deliberate act and should be justified in review.
 */
const ALLOWED_PUBLIC_VARS = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',       // a URL, not a credential
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',  // publishable by design; RLS is the control
  'NEXT_PUBLIC_TO_EMAIL',           // a contact address shown on the site
  'NEXT_PUBLIC_FROM_EMAIL',         // ditto
]);

/** Substrings that mark a variable name as credential-shaped. */
const SECRET_MARKERS = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function collectPublicVars(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    for (const match of src.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
      const name = match[1];
      const rel = path.relative(SRC, file);
      const files = found.get(name) ?? [];
      if (!files.includes(rel)) files.push(rel);
      found.set(name, files);
    }
  }
  return found;
}

describe('N3 — no secrets behind NEXT_PUBLIC_*', () => {
  const publicVars = collectPublicVars();

  it('reads no credential-shaped NEXT_PUBLIC_* variable anywhere in src/', () => {
    const offenders: string[] = [];

    for (const [name, files] of publicVars) {
      const looksSecret = SECRET_MARKERS.some(marker => name.includes(marker));
      if (looksSecret && !ALLOWED_PUBLIC_VARS.has(name)) {
        offenders.push(`${name} (in ${files.join(', ')})`);
      }
    }

    expect(
      offenders,
      `Credential-shaped NEXT_PUBLIC_* vars are inlined into the client bundle.\n` +
        `Move these to a server-only env var and access them from a route handler:\n` +
        offenders.map(o => `  - ${o}`).join('\n')
    ).toEqual([]);
  });

  it('every NEXT_PUBLIC_* var in use is explicitly allow-listed', () => {
    const unlisted = [...publicVars.keys()].filter(n => !ALLOWED_PUBLIC_VARS.has(n));

    expect(
      unlisted,
      'New NEXT_PUBLIC_* vars must be added to ALLOWED_PUBLIC_VARS with a ' +
        'justification, so exposing a value to the browser is always a ' +
        'deliberate decision.'
    ).toEqual([]);
  });

  it('the specific keys from the 2026-08 audit stay gone', () => {
    expect(publicVars.has('NEXT_PUBLIC_OPENAI_API_KEY')).toBe(false);
    expect(publicVars.has('NEXT_PUBLIC_RESEND_API_KEY')).toBe(false);
  });
});

describe('N3 — server-only key usage', () => {
  it('openai-service resolves its key from a server-only var', () => {
    const src = readFileSync(path.join(SRC, 'lib/openai-service.ts'), 'utf8');
    expect(src).toContain('process.env.OPENAI_API_KEY');
    expect(src).not.toContain('NEXT_PUBLIC_OPENAI_API_KEY');
  });

  it('the chatbot generate route has no NEXT_PUBLIC fallback', () => {
    const src = readFileSync(
      path.join(SRC, 'app/api/chatbot/generate/route.ts'),
      'utf8'
    );
    expect(src).not.toContain('NEXT_PUBLIC_OPENAI_API_KEY');
  });

  it('ResendService carries no apiKey in its config', () => {
    const src = readFileSync(path.join(SRC, 'lib/chatbot/resendService.ts'), 'utf8');
    // The interface must not declare a key field. ([\s\S] rather than the /s
    // flag — tsconfig targets ES2017.)
    expect(src).not.toMatch(/export interface ResendConfig \{[\s\S]*?apiKey/);
  });
});
