import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Envelope encryption for provider API keys.
 *
 * Keys live in Postgres so they can be managed from /edit without a redeploy.
 * That is only defensible if the database on its own is worthless: the key
 * material that decrypts them stays in CREDENTIALS_ENCRYPTION_KEY, in the
 * environment, so a leaked DATABASE_URL, a nightly backup, or a read replica
 * yields ciphertext and nothing else.
 *
 * AES-256-GCM rather than CBC: it authenticates as well as encrypts, so a row
 * edited in the database fails to decrypt instead of silently producing
 * garbage that then gets sent to a provider as a bearer token.
 *
 * Node-only. Never import this into a client component.
 */

/** 96 bits is the GCM standard and what the construction is analysed for. */
const IV_BYTES = 12;
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  /** Display-only tail, so the admin can tell which key is loaded. */
  last4: string;
  /** Lets a future key rotation decrypt old rows with the previous key. */
  keyVersion: number;
}

/**
 * Read at call time, not at module load: reading at import would crash any
 * route that merely touches this module, including ones that never encrypt.
 */
function encryptionKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32'
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY must decode to 32 bytes for AES-256, got ${key.length}.`
    );
  }

  return key;
}

/** Shows enough of a key to recognise it, and no more. */
export function maskSecret(secret: string): string {
  if (secret.length < 8) return '••••';
  return `••••${secret.slice(-4)}`;
}

export function encryptSecret(secret: string): EncryptedSecret {
  if (!secret) {
    throw new Error('Refusing to encrypt an empty secret.');
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);

  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    last4: secret.length >= 4 ? secret.slice(-4) : '',
    keyVersion: 1,
  };
}

/**
 * Throws on any tampering or key mismatch. Callers must not catch this and
 * substitute a default — a failure here means the stored value cannot be
 * trusted, and proceeding without a key is the correct outcome.
 */
export function decryptSecret(record: {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}): string {
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), record.iv);
  decipher.setAuthTag(record.authTag);
  return Buffer.concat([decipher.update(record.ciphertext), decipher.final()]).toString('utf8');
}
