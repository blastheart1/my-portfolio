/**
 * site-metadata.test.ts
 *
 * Guard rails:
 *   N6 — / must not be force-dynamic (that would silently disable the cache
 *        entry every revalidatePath('/') call depends on)
 *   N7 — no service worker may serve stale HTML or cache /api/*
 *   N8 — no canonical / OG / JSON-LD URL may reference the wrong domain
 *   N9 — no public route may ship without an explicit alternates.canonical
 *  N13 — no blog write path may skip revalidatePath or submitToIndexNow
 *  N20 — the generator may not use a deprecated model or omit response_format,
 *        and the manifest's identity may not drift from layout.tsx
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROLE_TITLE, SITE_URL, SITE_DOMAIN, absoluteUrl } from '../site';
import { readCode } from './support/source';

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.resolve(__dirname, '../..');

/** Source with comments stripped — see the helper's docblock for why. */
function codeOf(relativePath: string): string {
  return readCode(path.join(SRC, relativePath));
}

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
    // The nodes moved out of the component into src/lib/structured-data.ts
    // when they were split by route; the component is now a <script> wrapper
    // with no URLs in it at all.
    const sd = readFileSync(path.join(SRC, 'lib/structured-data.ts'), 'utf8');
    expect(sd).toMatch(/from ['"]@\/lib\/site['"]/);
    expect(sd).toContain('SITE_URL');
    expect(sd, 'structured-data still hardcodes an origin').not.toMatch(/https?:\/\/[a-z]+\.dev/);
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


/**
 * N9 — the canonical trap.
 *
 * src/app/layout.tsx sets `alternates: { canonical: SITE_URL }`, and Next
 * merges metadata shallowly down the segment tree. A route that does not
 * define its own `alternates` therefore inherits the HOME PAGE's canonical and
 * tells Google it is a duplicate of `/`.
 *
 * This is worse than a missing canonical, and it is invisible: the page looks
 * perfect in a browser and in devtools. /website-workflow shipped in exactly
 * that state. Any new route added without this line would too.
 */
describe('N9 — every public route declares its own canonical', () => {
  /** Only the home page may use the root layout's canonical, because it IS it. */
  const ALLOWED_TO_INHERIT = ['app/page.tsx'];

  it('no page under app/ relies on the inherited one', () => {
    const offenders: string[] = [];

    for (const file of walk(path.join(SRC, 'app'))) {
      const rel = path.relative(SRC, file).split(path.sep).join('/');

      if (!rel.endsWith('/page.tsx')) continue;
      if (rel.includes('__tests__')) continue;
      // The admin area is disallowed in robots.txt and behind auth; a
      // canonical on a page no crawler may fetch would mean nothing.
      if (rel.startsWith('app/edit/')) continue;
      if (ALLOWED_TO_INHERIT.includes(rel)) continue;

      const src = readFileSync(file, 'utf8');
      // Either declared inline, or returned from generateMetadata — including
      // via a shared helper, which is why this looks for the key rather than a
      // particular expression.
      if (!/alternates\s*:/.test(src) && !/canonical/.test(src)) {
        offenders.push(rel);
      }
    }

    expect(
      offenders,
      'These routes inherit alternates.canonical from src/app/layout.tsx, ' +
        'which points at the home page. Next merges metadata shallowly, so ' +
        'each of these currently tells Google it is a duplicate of / and will ' +
        'be collapsed into it. Set alternates.canonical to the route\u2019s own ' +
        'URL:\n' + offenders.join('\n')
    ).toEqual([]);
  });

  it('the root layout still sets one, which is what the rule depends on', () => {
    const layout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/alternates\s*:/);
  });
});

/**
 * N13 — the blog write paths propagate.
 *
 * N6 above walks app/api/admin only, so neither blog writer is covered by it.
 * Both publish content that appears on / and /blog and must say so.
 */
describe('N13 — blog writes invalidate and announce', () => {
  const WRITE_ROUTES = [
    'app/api/blog/generate/route.ts',
    'app/api/cron/generate-content/route.ts',
  ];

  it('each write route revalidates and submits to IndexNow', () => {
    for (const rel of WRITE_ROUTES) {
      const src = readFileSync(path.join(SRC, rel), 'utf8');

      expect(src, `${rel} must invalidate the pages a new post appears on`).toContain(
        'revalidatePath'
      );
      expect(src, `${rel} must refresh the sitemap`).toContain("revalidatePath('/sitemap.xml')");
      expect(src, `${rel} must tell the search engines`).toContain('submitToIndexNow');
    }
  });

  it('submits the post\u2019s own URL, not just the home page', () => {
    // The four existing admin callers submit '/' because that is the page
    // their edit changes. A new post has its own URL, which is the whole
    // point of IndexNow.
    for (const rel of WRITE_ROUTES) {
      const src = readFileSync(path.join(SRC, rel), 'utf8');
      expect(src, rel).toMatch(/submitToIndexNow\(\[`\/blog\/\$\{/);
    }
  });

  it('awaits the submission rather than firing and forgetting', () => {
    // void submitToIndexNow(...) is right in an admin route, where a browser
    // is waiting on the response. In a cron the instance can freeze the
    // moment the response returns, dropping the request.
    for (const rel of WRITE_ROUTES) {
      const src = readFileSync(path.join(SRC, rel), 'utf8');
      expect(src, rel).toContain('await submitToIndexNow');
    }
  });

  it('no blog route is exempted from revalidating', () => {
    // Stops the tempting fix if a future admin blog route trips N6.
    const exempt = readFileSync(path.join(SRC, 'lib/__tests__/site-metadata.test.ts'), 'utf8');
    const blogExemptions = [...exempt.matchAll(/'(app\/api\/[^']*blog[^']*)':/g)];
    expect(blogExemptions.map(m => m[1])).toEqual([]);
  });
});

describe('N20 — the generator and the manifest cannot drift', () => {
  it('does not use the deprecated drafting model', () => {
    // Which model is best keeps changing and is not a testable judgement.
    // That it is not the one that has been superseded twice is a fact.
    expect(codeOf('lib/openai-service.ts')).not.toContain('gpt-3.5-turbo');
  });

  it('asks the provider for JSON rather than hoping', () => {
    const src = readFileSync(path.join(SRC, 'lib/openai-service.ts'), 'utf8');
    expect(src).toContain("response_format: { type: 'json_object' }");
  });

  it('no longer instructs the model to print a no-source disclaimer', () => {
    // That string used to be written into post bodies, where it read as an
    // apology for the absence of research.
    expect(codeOf('lib/openai-service.ts')).not.toContain('No relevant case study available');
  });

  it('the manifest describes the same person as the layout metadata', () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/site.webmanifest'), 'utf8'));
    const layout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8');

    // Both sides are checked against the one constant rather than against
    // each other's literals, so repositioning means editing ROLE_TITLE and
    // nothing can be left behind. The manifest has drifted twice already.
    expect(manifest.name).toContain('Antonio Luis Santos');
    expect(manifest.name).toContain(ROLE_TITLE);
    expect(layout, 'layout must build its title from ROLE_TITLE').toContain('ROLE_TITLE');

    // The description is prose and writes the role in lower case, so this
    // pins what must NOT be said rather than the exact wording.
    expect(manifest.description).toMatch(/AI automation and integration engineer/i);
    expect(
      manifest.description,
      'a pre-repositioning description'
    ).not.toMatch(/Full-Stack Developer & QA Specialist/i);

    // The old brand, which survived every other rename.
    expect(JSON.stringify(manifest)).not.toMatch(/Luis\.dev/);

    // themeColor in layout.tsx is #ffffff / #1a1a1a; the manifest carried an
    // unrelated blue that no longer appears anywhere on the site.
    expect(manifest.theme_color).toBe('#1a1a1a');
  });
});
