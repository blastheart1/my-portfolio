import { getSql } from '@/lib/neon';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/credentials-crypto';

/**
 * Provider API keys, managed from /edit instead of the environment.
 *
 * Resolution is database -> environment -> null. Keys already set in Vercel
 * keep working untouched; setting one here overrides it; clearing it falls
 * back. That ordering is what makes this safe to adopt incrementally rather
 * than as a migration.
 *
 * Nothing in this module returns a plaintext key to a caller outside the
 * server. getProviderKey is for route handlers about to call a provider;
 * getCredentialStatus is what the admin UI sees, and it carries only a masked
 * tail.
 */

/**
 * Allowlist rather than free text. A typo would otherwise create a row that
 * silently never resolves, and the failure would look like "my key doesn't
 * work" rather than "that provider doesn't exist".
 */
export const PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek', 'moonshot'] as const;
export type Provider = (typeof PROVIDERS)[number];

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

/** The environment variable consulted when no database row exists. */
const ENV_VAR: Record<Provider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  google: 'Google Gemini',
  deepseek: 'DeepSeek',
  moonshot: 'Kimi (Moonshot)',
};

export type CredentialSource = 'database' | 'environment' | 'missing';

export interface CredentialStatus {
  provider: Provider;
  label: string;
  source: CredentialSource;
  /** Masked tail only. Never the key. */
  last4: string | null;
  updatedAt: string | null;
  envVar: string;
}

interface CredentialRow {
  ciphertext: Buffer;
  iv: Buffer;
  auth_tag: Buffer;
  last4: string;
  updated_at: string;
}

async function readRow(provider: Provider): Promise<CredentialRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ciphertext, iv, auth_tag, last4, updated_at
    FROM provider_credentials WHERE provider = ${provider}
  `) as unknown as CredentialRow[];
  return rows[0] ?? null;
}

/** Neon returns BYTEA as a Buffer or as a \x-prefixed hex string, depending on driver path. */
function toBuffer(value: Buffer | string): Buffer {
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from(value.replace(/^\\x/, ''), 'hex');
}

/**
 * The usable key for a provider call, or null.
 *
 * Never log the return value. A decryption failure resolves to the environment
 * rather than throwing: a corrupted row should degrade to the previous
 * behaviour, not take the endpoint down. The failure is logged without the
 * ciphertext so it is still visible.
 */
export async function getProviderKey(provider: Provider): Promise<string | null> {
  try {
    const row = await readRow(provider);
    if (row) {
      try {
        return decryptSecret({
          ciphertext: toBuffer(row.ciphertext),
          iv: toBuffer(row.iv),
          authTag: toBuffer(row.auth_tag),
        });
      } catch {
        console.error(
          `provider_credentials row for "${provider}" failed to decrypt; falling back to environment`
        );
      }
    }
  } catch (err) {
    console.error(`Could not read provider_credentials for "${provider}":`, err);
  }

  return process.env[ENV_VAR[provider]] ?? null;
}

/** What the admin UI is allowed to see. Carries no key material. */
export async function getCredentialStatus(provider: Provider): Promise<CredentialStatus> {
  const base = {
    provider,
    label: PROVIDER_LABELS[provider],
    envVar: ENV_VAR[provider],
  };

  try {
    const row = await readRow(provider);
    if (row) {
      return {
        ...base,
        source: 'database',
        last4: row.last4 || null,
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    }
  } catch (err) {
    console.error(`Could not read credential status for "${provider}":`, err);
  }

  const fromEnv = process.env[ENV_VAR[provider]];
  return fromEnv
    ? { ...base, source: 'environment', last4: maskSecret(fromEnv).slice(-4), updatedAt: null }
    : { ...base, source: 'missing', last4: null, updatedAt: null };
}

export async function getAllCredentialStatuses(): Promise<CredentialStatus[]> {
  return Promise.all(PROVIDERS.map(getCredentialStatus));
}

export async function setProviderKey(provider: Provider, secret: string): Promise<void> {
  const record = encryptSecret(secret);
  const sql = getSql();
  await sql`
    INSERT INTO provider_credentials (provider, ciphertext, iv, auth_tag, last4, key_version, updated_at)
    VALUES (
      ${provider}, ${record.ciphertext}, ${record.iv}, ${record.authTag},
      ${record.last4}, ${record.keyVersion}, now()
    )
    ON CONFLICT (provider) DO UPDATE SET
      ciphertext  = EXCLUDED.ciphertext,
      iv          = EXCLUDED.iv,
      auth_tag    = EXCLUDED.auth_tag,
      last4       = EXCLUDED.last4,
      key_version = EXCLUDED.key_version,
      updated_at  = now()
  `;
}

/** Removes the row so resolution falls back to the environment. */
export async function clearProviderKey(provider: Provider): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM provider_credentials WHERE provider = ${provider}`;
}
