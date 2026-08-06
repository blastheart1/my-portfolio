/**
 * dev-bypass.test.ts
 *
 * The local /edit auth bypass is a real hole in the auth layer. These tests
 * exist to prove it cannot open anywhere except a developer's machine.
 *
 * Guard rails:
 *   - production ignores the flag entirely, however it is set
 *   - only the exact string 'true' enables it
 *   - the admin API honours the same gate as the page routes, so enabling it
 *     does not leave the UI loading with every fetch returning 401
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

/** NODE_ENV is readonly in the Next types; tests need to drive it. */
function setEnv(nodeEnv: string | undefined, bypass: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, unknown>).NODE_ENV;
  else (process.env as Record<string, unknown>).NODE_ENV = nodeEnv;

  if (bypass === undefined) delete process.env.ADMIN_DEV_BYPASS;
  else process.env.ADMIN_DEV_BYPASS = bypass;
}

async function isEnabled(): Promise<boolean> {
  const { isDevAuthBypassEnabled } = await import('../admin-auth');
  return isDevAuthBypassEnabled();
}

describe('production can never bypass auth', () => {
  it('ignores ADMIN_DEV_BYPASS=true in production', async () => {
    // Vercel sets NODE_ENV=production for preview deployments too, so this
    // single check covers every deployed environment.
    setEnv('production', 'true');
    expect(await isEnabled()).toBe(false);
  });

  it('stays off in production however the flag is spelled', async () => {
    for (const value of ['true', 'TRUE', '1', 'yes', 'on']) {
      setEnv('production', value);
      vi.resetModules();
      expect(await isEnabled(), value).toBe(false);
    }
  });
});

describe('the flag must be opted into explicitly', () => {
  it('is off in development when unset', async () => {
    setEnv('development', undefined);
    expect(await isEnabled()).toBe(false);
  });

  it('is off for truthy-looking values that are not exactly "true"', async () => {
    for (const value of ['1', 'yes', 'TRUE', 'True', 'on', '']) {
      setEnv('development', value);
      vi.resetModules();
      expect(await isEnabled(), value).toBe(false);
    }
  });

  it('is on only for the exact string "true" outside production', async () => {
    setEnv('development', 'true');
    expect(await isEnabled()).toBe(true);
  });

  it('also applies under test, so suites can exercise both paths', async () => {
    setEnv('test', 'true');
    expect(await isEnabled()).toBe(true);
  });
});

describe('requireAdmin honours the same gate', () => {
  const req = () =>
    new NextRequest('https://localhost/api/admin/projects', { method: 'GET' });

  it('still 401s an anonymous request when the bypass is off', async () => {
    setEnv('development', undefined);
    const { requireAdmin } = await import('../require-admin');

    const res = await requireAdmin(req());
    expect(res?.status).toBe(401);
  });

  it('lets an anonymous request through when the bypass is on', async () => {
    // Otherwise /edit would render but every data fetch would fail — a worse
    // experience than simply logging in.
    setEnv('development', 'true');
    const { requireAdmin } = await import('../require-admin');

    expect(await requireAdmin(req())).toBeNull();
  });

  it('still 401s in production even with the flag set', async () => {
    setEnv('production', 'true');
    const { requireAdmin } = await import('../require-admin');

    const res = await requireAdmin(req());
    expect(res?.status).toBe(401);
  });
});

describe('the bypass is not committed anywhere', () => {
  it('is absent from .env.example', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const path = await import('node:path');
    const file = path.resolve(__dirname, '../../../.env.example');

    if (!existsSync(file)) return; // nothing to leak into
    expect(readFileSync(file, 'utf8')).not.toContain('ADMIN_DEV_BYPASS');
  });
});
