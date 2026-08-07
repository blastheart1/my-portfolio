/**
 * site-metadata.test.ts
 *
 * Guard rails:
 *   N6 — / must not be force-dynamic (that would silently disable the cache
 *        entry every revalidatePath('/') call depends on)
 *   N7 — no service worker may serve stale HTML or cache /api/*
 *   N8 — no canonical / OG / JSON-LD URL may reference the wrong domain
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { SITE_URL, SITE_DOMAIN, absoluteUrl } from '../site';

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.resolve(__dirname, '../..');

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

describe('site constants', () => {
  it('points at the real production domain', () => {
    expect(SITE_URL).toBe('https://codebyluis.dev');
    expect(SITE_DOMAIN).toBe('codebyluis.dev');
  });

  it('uses https', () => {
    expect(SITE_URL.startsWith('https://')).toBe(true);
  });

  it('has no trailing slash, so absoluteUrl() cannot double up', () => {
    expect(SITE_URL.endsWith('/')).toBe(false);
    expect(absoluteUrl('/sitemap.xml')).toBe('https://codebyluis.dev/sitemap.xml');
    expect(absoluteUrl('/')).toBe('https://codebyluis.dev/');
  });
});

describe('N8 — the wrong domain is gone everywhere', () => {
  it('no source file builds a URL against the wrong origin', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      // The site.ts docblock explains the history and names the old domain.
      if (file.endsWith(path.join('lib', 'site.ts'))) continue;
      if (file.includes('__tests__')) continue;

      const src = readFileSync(file, 'utf8');
      // Only URL-shaped occurrences matter for canonicalisation. Plain-text
      // brand strings like "Luis.dev <hello@…>" are display copy, not routing,
      // and are deliberately out of scope here.
      for (const m of src.matchAll(/https?:\/\/(\w*)luis\.dev/gi)) {
        if (m[1].toLowerCase() !== 'codeby') {
          offenders.push(`${path.relative(SRC, file)}: ${m[0]}`);
        }
      }
    }

    expect(offenders, `Wrong-domain URLs found:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('sitemap and robots derive their origin from SITE_URL', () => {
    const sitemap = readFileSync(path.join(SRC, 'app/sitemap.ts'), 'utf8');
    const robots = readFileSync(path.join(SRC, 'app/robots.ts'), 'utf8');

    // Stronger than checking for the literal domain: importing the shared
    // constant is what makes a future rename impossible to get half-done.
    for (const [name, src] of [['sitemap', sitemap], ['robots', robots]] as const) {
      expect(src, name).toMatch(/from ['"]@\/lib\/site['"]/);
      expect(src, name).toContain('SITE_URL');
      expect(src, `${name} still hardcodes an origin`).not.toMatch(/https?:\/\/[a-z]+\.dev/);
    }
  });

  it('robots still disallows the admin area', () => {
    const robots = readFileSync(path.join(SRC, 'app/robots.ts'), 'utf8');
    expect(robots).toContain('/edit/');
  });

  it('structured data derives its origin from SITE_URL', () => {
    const sd = readFileSync(path.join(SRC, 'components/StructuredData.tsx'), 'utf8');
    expect(sd).toMatch(/from ['"]@\/lib\/site['"]/);
    expect(sd).toContain('SITE_URL');
    expect(sd, 'StructuredData still hardcodes an origin').not.toMatch(/https?:\/\/[a-z]+\.dev/);
  });
});

describe('N6 — the home page stays cacheable', () => {
  const page = readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');

  it('does not declare force-dynamic', () => {
    expect(
      /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(page),
      'force-dynamic on / disables the cache entry that every ' +
        "revalidatePath('/') call invalidates, making the site slower AND " +
        'turning all 11 of those calls into no-ops.'
    ).toBe(false);
  });

  it('declares a revalidate floor', () => {
    expect(/export\s+const\s+revalidate\s*=\s*\d+/.test(page)).toBe(true);
  });

  /**
   * Routes that mutate data which the cached home page does NOT render, and so
   * legitimately need no revalidatePath('/'). Each entry is a deliberate
   * exemption — anything not listed here must invalidate the page.
   */
  const REVALIDATE_EXEMPT: Record<string, string> = {
    'app/api/admin/chatbot/config/route.ts':
      'ai_config is read per-request by /api/chatbot/generate, never rendered into /',
    'app/api/admin/images/route.ts':
      'media_assets is only read by the admin images API; / does not render it',
    'app/api/admin/images/[id]/route.ts':
      'same as images/route.ts — delete affects the admin library only',
  };

  it('admin mutations still call revalidatePath so edits propagate', () => {
    const adminRoutes = walk(path.join(SRC, 'app/api/admin'))
      .filter(f => f.endsWith('route.ts') && !f.includes(`${path.sep}auth${path.sep}`));

    const mutating = adminRoutes.filter(f =>
      /export async function (POST|PATCH|PUT|DELETE)/.test(readFileSync(f, 'utf8'))
    );

    const missing = mutating
      .map(f => path.relative(SRC, f))
      .filter(rel => !REVALIDATE_EXEMPT[rel])
      .filter(rel => !readFileSync(path.join(SRC, rel), 'utf8').includes('revalidatePath'));

    expect(
      missing,
      'These routes mutate content rendered on / but never invalidate it, so ' +
        'edits would not appear until the revalidate floor elapsed. Either add ' +
        "revalidatePath('/') or document an exemption in REVALIDATE_EXEMPT."
    ).toEqual([]);
  });

  it('every exemption still points at a real route file', () => {
    // Stops the allow-list rotting into a way to hide a genuine miss.
    const stale = Object.keys(REVALIDATE_EXEMPT).filter(
      rel => !existsSync(path.join(SRC, rel))
    );
    expect(stale, 'Exempted routes that no longer exist').toEqual([]);
  });
});

describe('N7 — no stale-serving service worker', () => {
  it('public/sw.js is deleted', () => {
    expect(existsSync(path.join(ROOT, 'public/sw.js'))).toBe(false);
  });

  it('the shim unregisters rather than registers', () => {
    const src = readFileSync(path.join(SRC, 'components/ServiceWorker.tsx'), 'utf8');
    expect(src).toContain('unregister');
    expect(src).not.toMatch(/serviceWorker\s*\.\s*register\s*\(/);
  });
});
