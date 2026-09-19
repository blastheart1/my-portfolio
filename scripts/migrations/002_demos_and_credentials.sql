-- 002_demos_and_credentials.sql
--
-- Adds: encrypted provider credentials, demo usage quotas, visitor-captured
-- demo notes, and the section rows that gate the new /work routes.
--
-- EXPAND ONLY. No DROP, no ALTER TYPE, no NOT NULL added to an existing
-- column, no rename. Every statement is IF NOT EXISTS or ON CONFLICT, so
-- running this twice is a no-op and running it half-way loses nothing.
--
-- There is deliberately no down-migration. A DROP in a rollback script is how
-- data gets lost during an incident; reverting the code leaves these tables
-- unused, which is harmless.

-- ─── 1. Provider credentials ────────────────────────────────────────────────
-- Only ciphertext lives here. The key that decrypts it is
-- CREDENTIALS_ENCRYPTION_KEY, held in the environment, so a leaked
-- DATABASE_URL, a backup, or a read replica yields nothing usable.
CREATE TABLE IF NOT EXISTS provider_credentials (
  provider     TEXT        PRIMARY KEY,
  ciphertext   BYTEA       NOT NULL,
  iv           BYTEA       NOT NULL,   -- 12 bytes, fresh per write
  auth_tag     BYTEA       NOT NULL,   -- GCM tag; detects tampering
  last4        TEXT        NOT NULL,   -- display only, never the whole key
  key_version  SMALLINT    NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Per-visitor daily quota ─────────────────────────────────────────────
-- visitor_hash is a SHA-256 of a first-party cookie id and the client IP.
-- A raw IP is never stored.
CREATE TABLE IF NOT EXISTS demo_usage (
  visitor_hash TEXT        NOT NULL,
  demo_id      TEXT        NOT NULL,
  usage_day    DATE        NOT NULL,
  used         INTEGER     NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,            -- drives the cooldown between uses
  PRIMARY KEY (visitor_hash, demo_id, usage_day)
);

-- Supports the retention sweep, which deletes by day.
CREATE INDEX IF NOT EXISTS demo_usage_day_idx ON demo_usage (usage_day);

-- ─── 3. Global daily ceiling ────────────────────────────────────────────────
-- The per-visitor cap is defeated by clearing a cookie. This is the limit that
-- actually bounds spend.
CREATE TABLE IF NOT EXISTS demo_usage_global (
  demo_id   TEXT    NOT NULL,
  usage_day DATE    NOT NULL,
  used      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (demo_id, usage_day)
);

-- ─── 4. Visitor-captured demo notes ─────────────────────────────────────────
-- Scoped to a visitor_hash and swept on a TTL, so the table cannot grow without
-- bound and one visitor can never read another's captures.
CREATE TABLE IF NOT EXISTS demo_notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_hash TEXT        NOT NULL,
  demo_id      TEXT        NOT NULL,
  payload      JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_notes_visitor_idx
  ON demo_notes (visitor_hash, demo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS demo_notes_created_idx
  ON demo_notes (created_at);

-- ─── 5. Section rows for the new routes ─────────────────────────────────────
-- Seeded hidden. The DO UPDATE deliberately touches only `label`: re-running
-- this migration must never un-hide a section that was switched off in /edit.
INSERT INTO sections (id, label, visible, sort_order) VALUES
  ('work',           'Work',           true,  8),
  ('demo_relay',     'Relay demo',     false, 9),
  ('demo_resume_ai', 'ResumeAI demo',  false, 10),
  ('automation_lab', 'Automation lab', false, 11)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;
