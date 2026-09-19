-- Move the blog onto Neon.
--
--   node scripts/run-migration.mjs scripts/migrations/005_blog_on_neon.sql --dry-run
--   node scripts/run-migration.mjs scripts/migrations/005_blog_on_neon.sql --yes
--
-- blog_posts was the last table on Supabase. src/lib/database.ts has carried a
-- note since it was written saying consolidating onto Neon was worth doing and
-- deliberately not bundled; this is that work.
--
-- It is worth more than tidiness. Four problems disappear at once:
--
--   1. RLS. Every blog read AND write ran with NEXT_PUBLIC_SUPABASE_ANON_KEY,
--      which ships in the browser bundle, and the only thing standing behind
--      it was a row-level policy nobody had verified. Neon is reached through
--      DATABASE_URL, which is server-only and never sent to a client, so the
--      question stops existing rather than getting answered.
--   2. No migration tooling. The Supabase schema was created by hand in a
--      console and existed nowhere in version control. This file is applied by
--      the same runner as every other migration, recorded in
--      schema_migrations, and refuses destructive statements.
--   3. Local development. Neon is configured; Supabase was not, so the blog
--      was simply absent locally and every check against it was theatre.
--   4. One database. Two clients, two failure modes and two mental models for
--      one small application.
--
-- Nothing is migrated out of Supabase here, and nothing there is touched. Any
-- existing rows stay where they are until exported deliberately. Most were
-- destined for the quarantine sweep anyway.
--
-- The slug column is NOT NULL UNIQUE from the start, which the Supabase table
-- could not be: adding it there meant a three-step dance against rows that
-- already existed. A new table has no such history.

CREATE TABLE IF NOT EXISTS blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The permanent URL segment. Assigned once at insert and never rewritten,
  -- because changing it breaks every link and index entry pointing at it.
  -- See src/lib/blog/slug.ts and guard rail N16.
  slug            text        NOT NULL UNIQUE,

  title           text        NOT NULL,
  content         text        NOT NULL,
  excerpt         text        NOT NULL,

  -- Kept as a constrained text column rather than an enum: adding a value to
  -- a Postgres enum is a migration, and the set of post kinds is the sort of
  -- thing that grows.
  type            text        NOT NULL DEFAULT 'blog'
                  CHECK (type IN ('blog', 'case-study')),

  topic           text        NOT NULL,

  metrics         jsonb,
  sources         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  case_study_link text,

  -- Defaults to false, the opposite of the Supabase table's behaviour. Both
  -- write paths set it explicitly, and a row that somehow arrives without an
  -- opinion should be invisible rather than live.
  published       boolean     NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The public read is always "published, newest first".
CREATE INDEX IF NOT EXISTS blog_posts_published_created_idx
  ON blog_posts (published, created_at DESC);

-- updated_at has to be maintained by something. Supabase did it with a
-- trigger nobody could see from the repo; doing it here means dateModified in
-- the JSON-LD and lastModified in the sitemap reflect a real edit rather than
-- the row's creation.
CREATE OR REPLACE FUNCTION blog_posts_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION blog_posts_touch_updated_at();
