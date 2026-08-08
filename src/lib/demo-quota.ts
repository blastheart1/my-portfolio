import { createHash } from 'node:crypto';

import { getSql } from '@/lib/neon';

/**
 * Quota for the public demos.
 *
 * These endpoints call paid providers with no login in front of them, so the
 * limit has to hold against a caller who is actively trying to get around it.
 * A cookie cannot do that: clearing it, or a private window, mints a new
 * visitor. So the cookie is a courtesy for honest visitors and the enforcement
 * sits on things the caller does not choose.
 *
 * Four buckets, and a request needs all four to allow it:
 *
 *   cookie  per browser — keeps people behind one NAT from starving each other
 *   ip      survives clearing cookies
 *   subnet  survives cycling addresses within a /24 (v4) or /48 (v6)
 *   global  bounds spend no matter what anyone does
 *
 * The layering matters more than any single number. Someone determined will
 * get past the first three; the global ceiling is the one that guarantees a
 * bad day costs a known amount. Treat the rest as friction that keeps casual
 * abuse from ever reaching it.
 *
 * Counting is done by the database, not this process: the previous in-memory
 * limiter reset on every cold start and kept per-instance counters, which on
 * Fluid Compute meant a "daily" cap was neither daily nor a cap.
 */

export const DEMO_LIMITS = {
  perDay: 3,
  cooldownMinutes: 5,
  /** Deliberately above perDay: a shared office or campus is not an attacker. */
  perSubnetPerDay: 12,
  globalPerDay: 150,
} as const;

export type QuotaReason = 'cooldown' | 'daily' | 'ip' | 'subnet' | 'global';

export interface QuotaResult {
  allowed: boolean;
  used: number;
  remaining: number;
  reason?: QuotaReason;
  retryAfterSeconds?: number;
}

// Injectable so tests can move time without sleeping. Production never sets it.
let clock: () => Date = () => new Date();
export function __setQuotaClock(fn: () => Date): void {
  clock = fn;
}

/**
 * SHA-256 so no raw IP is written to the database. This is a pseudonym, not a
 * secret: the input space is small enough to brute-force, so it protects
 * against casual disclosure in a dump, not against a determined analyst.
 */
export function hashVisitor(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Collapses an address to the block a single party plausibly controls: /24 for
 * IPv4, /48 for IPv6. A residential IPv6 allocation is routinely a /64 or
 * larger, so keying on the full address would let one visitor cycle through
 * billions of them.
 */
export function subnetOf(ip: string): string {
  if (ip.includes(':')) {
    const groups = ip.split(':');
    return `v6:${groups.slice(0, 3).join(':')}`;
  }
  const octets = ip.split('.');
  if (octets.length === 4) return `v4:${octets.slice(0, 3).join('.')}`;
  return `raw:${ip}`;
}

/**
 * In-memory store used only by tests, so the quota logic can be exercised
 * without a database. Production always goes through SQL below.
 */
interface Bucket {
  used: number;
  lastUsedAt: Date | null;
}
let testStore: Map<string, Bucket> | null = null;
export function __resetQuotaStore(): void {
  testStore = new Map();
}

function day(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function bucket(key: string): Bucket {
  const store = testStore!;
  let entry = store.get(key);
  if (!entry) {
    entry = { used: 0, lastUsedAt: null };
    store.set(key, entry);
  }
  return entry;
}

export interface QuotaRequest {
  demoId: string;
  cookieId: string;
  ip: string;
}

/**
 * Reserves one use, or explains why it cannot.
 *
 * The reservation happens BEFORE the provider call. A refund on provider
 * failure is safe to add later; the reverse order is not, because two requests
 * could both read "2 used" and both proceed.
 *
 * A rejected attempt must not advance the cooldown clock. If it did, a client
 * retrying on a timer would hold itself out indefinitely, and the visitor with
 * a flaky connection would be punished hardest.
 */
export async function consumeDemoQuota(req: QuotaRequest): Promise<QuotaResult> {
  const at = clock();
  const today = day(at);
  const cooldownMs = DEMO_LIMITS.cooldownMinutes * 60_000;

  const keys = {
    cookie: `cookie:${req.demoId}:${today}:${hashVisitor(req.cookieId)}`,
    ip: `ip:${req.demoId}:${today}:${hashVisitor(req.ip)}`,
    subnet: `subnet:${req.demoId}:${today}:${hashVisitor(subnetOf(req.ip))}`,
    global: `global:${req.demoId}:${today}`,
  };

  if (testStore) {
    const cookie = bucket(keys.cookie);
    const ip = bucket(keys.ip);
    const subnet = bucket(keys.subnet);
    const global = bucket(keys.global);

    // Ceiling first: past it nothing else matters, and checking it first keeps
    // a blocked request from touching any other counter.
    if (global.used >= DEMO_LIMITS.globalPerDay) {
      return { allowed: false, used: cookie.used, remaining: 0, reason: 'global' };
    }

    // Cooldown runs off the strongest identity the caller cannot discard, so a
    // fresh cookie on the same address does not skip the wait.
    const last = ip.lastUsedAt;
    if (last && at.getTime() - last.getTime() < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - (at.getTime() - last.getTime())) / 1000);
      return {
        allowed: false,
        used: cookie.used,
        remaining: Math.max(0, DEMO_LIMITS.perDay - cookie.used),
        reason: 'cooldown',
        retryAfterSeconds,
      };
    }

    if (cookie.used >= DEMO_LIMITS.perDay) {
      return { allowed: false, used: cookie.used, remaining: 0, reason: 'daily' };
    }
    if (ip.used >= DEMO_LIMITS.perDay) {
      return { allowed: false, used: ip.used, remaining: 0, reason: 'ip' };
    }
    if (subnet.used >= DEMO_LIMITS.perSubnetPerDay) {
      return { allowed: false, used: subnet.used, remaining: 0, reason: 'subnet' };
    }

    for (const b of [cookie, ip, subnet, global]) {
      b.used += 1;
      b.lastUsedAt = at;
    }

    return {
      allowed: true,
      used: cookie.used,
      remaining: Math.max(0, DEMO_LIMITS.perDay - cookie.used),
    };
  }

  return consumeFromDatabase(req, at, today);
}

/**
 * Production path.
 *
 * Each bucket is an upsert whose DO UPDATE carries its own WHERE, so the check
 * and the increment are one statement. A read followed by a write would let
 * two concurrent requests both see the last remaining use.
 *
 * Buckets are claimed in ceiling-first order and released on the first refusal,
 * so a rejected request leaves no counter advanced.
 */
async function consumeFromDatabase(
  req: QuotaRequest,
  at: Date,
  today: string
): Promise<QuotaResult> {
  const sql = getSql();
  const cookieHash = hashVisitor(req.cookieId);
  const ipHash = hashVisitor(req.ip);
  const subnetHash = hashVisitor(subnetOf(req.ip));
  const cooldown = `${DEMO_LIMITS.cooldownMinutes} minutes`;

  const globalRows = (await sql`
    INSERT INTO demo_usage_global (demo_id, usage_day, used)
    VALUES (${req.demoId}, ${today}::date, 1)
    ON CONFLICT (demo_id, usage_day)
    DO UPDATE SET used = demo_usage_global.used + 1
    WHERE demo_usage_global.used < ${DEMO_LIMITS.globalPerDay}
    RETURNING used
  `) as unknown as { used: number }[];

  if (globalRows.length === 0) {
    return { allowed: false, used: 0, remaining: 0, reason: 'global' };
  }

  // The IP bucket carries the cooldown, because it is the identity a caller
  // cannot discard by clearing storage.
  const ipRows = (await sql`
    INSERT INTO demo_usage (visitor_hash, demo_id, usage_day, used, last_used_at)
    VALUES (${ipHash}, ${req.demoId}, ${today}::date, 1, ${at.toISOString()})
    ON CONFLICT (visitor_hash, demo_id, usage_day)
    DO UPDATE SET used = demo_usage.used + 1, last_used_at = ${at.toISOString()}
    WHERE demo_usage.used < ${DEMO_LIMITS.perDay}
      AND (demo_usage.last_used_at IS NULL
           OR demo_usage.last_used_at < ${at.toISOString()}::timestamptz - ${cooldown}::interval)
    RETURNING used
  `) as unknown as { used: number }[];

  if (ipRows.length === 0) {
    await releaseGlobal(req.demoId, today);
    return describeIpRefusal(ipHash, req.demoId, today, at);
  }

  const [cookieRows, subnetRows] = (await Promise.all([
    sql`
      INSERT INTO demo_usage (visitor_hash, demo_id, usage_day, used, last_used_at)
      VALUES (${`c:${cookieHash}`}, ${req.demoId}, ${today}::date, 1, ${at.toISOString()})
      ON CONFLICT (visitor_hash, demo_id, usage_day)
      DO UPDATE SET used = demo_usage.used + 1, last_used_at = ${at.toISOString()}
      WHERE demo_usage.used < ${DEMO_LIMITS.perDay}
      RETURNING used
    `,
    sql`
      INSERT INTO demo_usage (visitor_hash, demo_id, usage_day, used, last_used_at)
      VALUES (${`s:${subnetHash}`}, ${req.demoId}, ${today}::date, 1, ${at.toISOString()})
      ON CONFLICT (visitor_hash, demo_id, usage_day)
      DO UPDATE SET used = demo_usage.used + 1, last_used_at = ${at.toISOString()}
      WHERE demo_usage.used < ${DEMO_LIMITS.perSubnetPerDay}
      RETURNING used
    `,
  ])) as unknown as [{ used: number }[], { used: number }[]];

  if (cookieRows.length === 0 || subnetRows.length === 0) {
    await releaseGlobal(req.demoId, today);
    return {
      allowed: false,
      used: DEMO_LIMITS.perDay,
      remaining: 0,
      reason: cookieRows.length === 0 ? 'daily' : 'subnet',
    };
  }

  const used = cookieRows[0].used;
  return { allowed: true, used, remaining: Math.max(0, DEMO_LIMITS.perDay - used) };
}

/** Hands back a ceiling slot claimed for a request that was then refused. */
async function releaseGlobal(demoId: string, today: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE demo_usage_global SET used = GREATEST(0, used - 1)
    WHERE demo_id = ${demoId} AND usage_day = ${today}::date
  `;
}

/**
 * Only runs on the rejection path, so the extra read costs nothing that
 * matters. A slightly stale value here can only make the reported retry time
 * generous, never premature.
 */
async function describeIpRefusal(
  ipHash: string,
  demoId: string,
  today: string,
  at: Date
): Promise<QuotaResult> {
  const sql = getSql();
  const rows = (await sql`
    SELECT used, last_used_at FROM demo_usage
    WHERE visitor_hash = ${ipHash} AND demo_id = ${demoId} AND usage_day = ${today}::date
  `) as unknown as { used: number; last_used_at: string | null }[];

  const row = rows[0];
  if (!row) return { allowed: false, used: 0, remaining: 0, reason: 'ip' };

  if (row.used >= DEMO_LIMITS.perDay) {
    return { allowed: false, used: row.used, remaining: 0, reason: 'ip' };
  }

  const elapsed = row.last_used_at ? at.getTime() - new Date(row.last_used_at).getTime() : 0;
  const cooldownMs = DEMO_LIMITS.cooldownMinutes * 60_000;
  return {
    allowed: false,
    used: row.used,
    remaining: Math.max(0, DEMO_LIMITS.perDay - row.used),
    reason: 'cooldown',
    retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - elapsed) / 1000)),
  };
}
