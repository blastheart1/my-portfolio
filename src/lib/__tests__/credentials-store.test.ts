/**
 * credentials-store.test.ts
 *
 * Provider keys resolve database -> environment -> null, so keys already in
 * Vercel keep working and /edit overrides them without a redeploy.
 *
 * The property that matters most is the one that is easiest to lose in a
 * refactor: nothing the admin UI can reach may carry a plaintext key. Status
 * objects go to a browser; keys never do.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sqlMock = vi.fn();
vi.mock('@/lib/neon', () => ({ getSql: () => sqlMock }));

import {
  getProviderKey,
  getCredentialStatus,
  getAllCredentialStatuses,
  setProviderKey,
  clearProviderKey,
  isProvider,
  PROVIDERS,
} from '../credentials-store';
import { encryptSecret } from '../credentials-crypto';

const KEY = Buffer.alloc(32, 3).toString('base64');
const SECRET = 'sk-database-0000111122223333';
const ENV_SECRET = 'sk-environment-9999888877776666';

const ORIGINAL_ENC = process.env.CREDENTIALS_ENCRYPTION_KEY;
const ORIGINAL_OPENAI = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = KEY;
  delete process.env.OPENAI_API_KEY;
  sqlMock.mockReset();
  sqlMock.mockResolvedValue([]);
});

afterEach(() => {
  if (ORIGINAL_ENC === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  else process.env.CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_ENC;
  if (ORIGINAL_OPENAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIGINAL_OPENAI;
});

/** Puts an encrypted row in front of the store, as the database would. */
function storedRow(secret: string, updatedAt = '2026-08-08T00:00:00.000Z') {
  const record = encryptSecret(secret);
  sqlMock.mockResolvedValue([
    {
      ciphertext: record.ciphertext,
      iv: record.iv,
      auth_tag: record.authTag,
      last4: record.last4,
      updated_at: updatedAt,
    },
  ]);
}

describe('happy path', () => {
  it('returns the stored key for a provider call', async () => {
    storedRow(SECRET);

    await expect(getProviderKey('openai')).resolves.toBe(SECRET);
  });

  it('reports the database as the source, with a masked tail', async () => {
    storedRow(SECRET);

    const status = await getCredentialStatus('openai');

    expect(status.source).toBe('database');
    expect(status.last4).toBe(SECRET.slice(-4));
  });

  it('round-trips through setProviderKey', async () => {
    await setProviderKey('anthropic', SECRET);

    const [, ...values] = sqlMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    // The provider name is stored in the clear; the key never is.
    expect(values[0]).toBe('anthropic');
    expect(JSON.stringify(values)).not.toContain(SECRET);
  });
});

describe('resolution order', () => {
  it('falls back to the environment when no row exists', async () => {
    process.env.OPENAI_API_KEY = ENV_SECRET;
    sqlMock.mockResolvedValue([]);

    await expect(getProviderKey('openai')).resolves.toBe(ENV_SECRET);
    expect((await getCredentialStatus('openai')).source).toBe('environment');
  });

  it('prefers the database over the environment', async () => {
    process.env.OPENAI_API_KEY = ENV_SECRET;
    storedRow(SECRET);

    await expect(getProviderKey('openai')).resolves.toBe(SECRET);
  });

  it('reports missing when there is neither', async () => {
    sqlMock.mockResolvedValue([]);

    await expect(getProviderKey('openai')).resolves.toBeNull();
    expect((await getCredentialStatus('openai')).source).toBe('missing');
  });

  it('deletes the row when cleared, so the environment takes over again', async () => {
    await clearProviderKey('openai');

    const [strings] = sqlMock.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join('?')).toMatch(/DELETE FROM provider_credentials/i);
  });
});

describe('degrades rather than failing', () => {
  it('falls back to the environment when the database is unreachable', async () => {
    process.env.OPENAI_API_KEY = ENV_SECRET;
    sqlMock.mockRejectedValue(new Error('connection terminated'));

    await expect(getProviderKey('openai')).resolves.toBe(ENV_SECRET);
  });

  it('falls back when a stored row cannot be decrypted', async () => {
    process.env.OPENAI_API_KEY = ENV_SECRET;
    storedRow(SECRET);
    // Simulate the encryption key having been rotated out from under the row.
    process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 4).toString('base64');

    await expect(getProviderKey('openai')).resolves.toBe(ENV_SECRET);
  });

  it('returns null rather than throwing when everything fails', async () => {
    sqlMock.mockRejectedValue(new Error('down'));

    await expect(getProviderKey('openai')).resolves.toBeNull();
  });
});

describe('nothing the admin UI sees carries a key', () => {
  it('keeps plaintext out of a single status', async () => {
    storedRow(SECRET);

    expect(JSON.stringify(await getCredentialStatus('openai'))).not.toContain(SECRET);
  });

  it('keeps plaintext out of the full status list', async () => {
    process.env.OPENAI_API_KEY = ENV_SECRET;
    storedRow(SECRET);

    const serialised = JSON.stringify(await getAllCredentialStatuses());

    expect(serialised).not.toContain(SECRET);
    expect(serialised).not.toContain(ENV_SECRET);
  });

  it('exposes at most the last four characters', async () => {
    storedRow(SECRET);

    const status = await getCredentialStatus('openai');

    expect(status.last4).toHaveLength(4);
    expect(SECRET).not.toContain(`x${status.last4}x`);
  });
});

describe('provider allowlist', () => {
  it('accepts every advertised provider', () => {
    for (const provider of PROVIDERS) expect(isProvider(provider)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isProvider('not-a-provider')).toBe(false);
    expect(isProvider('')).toBe(false);
    expect(isProvider('OpenAI')).toBe(false); // case-sensitive on purpose
  });

  it('covers the vendors named on the public site', () => {
    // FAQ and llms.txt advertise these; a mismatch means a key cannot be set
    // for something the site claims to support.
    for (const provider of ['openai', 'anthropic', 'google', 'deepseek', 'moonshot']) {
      expect(isProvider(provider)).toBe(true);
    }
  });
});
