/**
 * credentials-crypto.test.ts
 *
 * Provider API keys move out of the environment and into Postgres so they can
 * be managed from /edit. That is only acceptable if the database alone is
 * useless to an attacker: a leaked DATABASE_URL, a backup, or a read replica
 * must not yield a working key.
 *
 * These tests pin the three properties the whole design rests on — encrypted
 * with a key held elsewhere, tamper-evident, and never recoverable from what is
 * stored or displayed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { encryptSecret, decryptSecret, maskSecret } from '../credentials-crypto';

const KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');
const SECRET = 'sk-proj-abcdef0123456789ABCDEF';

const ORIGINAL = process.env.CREDENTIALS_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = KEY;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  else process.env.CREDENTIALS_ENCRYPTION_KEY = ORIGINAL;
});

describe('round trip', () => {
  it('decrypts back to exactly the original secret', () => {
    const record = encryptSecret(SECRET);

    expect(decryptSecret(record)).toBe(SECRET);
  });

  it('handles a long key and unicode without corruption', () => {
    const odd = 'sk-' + 'x'.repeat(200) + '-café-🔑';

    expect(decryptSecret(encryptSecret(odd))).toBe(odd);
  });

  it('never reuses an IV', () => {
    const ivs = new Set(
      Array.from({ length: 50 }, () => encryptSecret(SECRET).iv.toString('hex'))
    );

    expect(ivs.size).toBe(50);
  });

  it('produces different ciphertext each time for the same input', () => {
    const a = encryptSecret(SECRET).ciphertext.toString('hex');
    const b = encryptSecret(SECRET).ciphertext.toString('hex');

    expect(a).not.toBe(b);
  });
});

describe('the database alone is not enough', () => {
  it('cannot be decrypted with a different key', () => {
    const record = encryptSecret(SECRET);
    process.env.CREDENTIALS_ENCRYPTION_KEY = OTHER_KEY;

    expect(() => decryptSecret(record)).toThrow();
  });

  it('stores no recognisable fragment of the secret', () => {
    const record = encryptSecret(SECRET);
    const stored = Buffer.concat([record.ciphertext, record.iv, record.authTag]).toString('binary');

    // Any 8-char window of the plaintext appearing in the stored bytes would
    // mean something is leaking through.
    for (let i = 0; i + 8 <= SECRET.length; i++) {
      expect(stored).not.toContain(SECRET.slice(i, i + 8));
    }
  });

  it('keeps the secret out of a serialised record', () => {
    const record = encryptSecret(SECRET);

    expect(JSON.stringify(record)).not.toContain(SECRET);
  });
});

describe('tampering fails closed', () => {
  it('rejects a modified ciphertext rather than returning partial plaintext', () => {
    const record = encryptSecret(SECRET);
    record.ciphertext[0] ^= 0xff;

    expect(() => decryptSecret(record)).toThrow();
  });

  it('rejects a modified auth tag', () => {
    const record = encryptSecret(SECRET);
    record.authTag[0] ^= 0xff;

    expect(() => decryptSecret(record)).toThrow();
  });

  it('rejects a swapped IV', () => {
    const record = encryptSecret(SECRET);
    record.iv = encryptSecret(SECRET).iv;

    expect(() => decryptSecret(record)).toThrow();
  });
});

describe('misconfiguration is loud', () => {
  it('throws when the encryption key is missing', () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;

    expect(() => encryptSecret(SECRET)).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
  });

  it('throws when the encryption key is the wrong length', () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');

    expect(() => encryptSecret(SECRET)).toThrow(/32 bytes/);
  });

  it('refuses to encrypt an empty secret', () => {
    expect(() => encryptSecret('')).toThrow();
  });
});

describe('masking is safe to display', () => {
  it('reveals only the last four characters', () => {
    expect(maskSecret('sk-proj-abcdefgh1234')).toBe('••••1234');
  });

  it('does not reveal anything for a short value', () => {
    expect(maskSecret('abc')).toBe('••••');
  });

  it('never contains the leading part of the secret', () => {
    expect(maskSecret(SECRET)).not.toContain('sk-proj');
  });
});
