import { getSql } from '@/lib/neon';
import { BlogPost } from '@/types/blog';
import { isValidSlug } from '@/lib/blog/slug';

/**
 * Blog storage.
 *
 * The blog was the last thing on Supabase while everything else in this app
 * ran on Neon. This file used to open with a note saying consolidating was
 * worth doing and deliberately out of scope;
 * scripts/migrations/005_blog_on_neon.sql is that work, and this is the other
 * half of it.
 *
 * It removed four problems rather than one:
 *
 *   - Every read AND write ran with NEXT_PUBLIC_SUPABASE_ANON_KEY, which is
 *     inlined into the browser bundle, with an unverified row-level policy as
 *     the only thing standing behind it. Neon is reached through DATABASE_URL,
 *     which is server-only and never sent to a client, so the question stops
 *     existing rather than getting answered.
 *   - The Supabase schema was created by hand in a console and existed nowhere
 *     in version control.
 *   - Supabase was not configured locally, so the blog was simply absent in
 *     development and every check against it was theatre.
 *   - Two clients and two failure modes for one small application.
 *
 * Every read still swallows its own errors and degrades to empty. That was
 * true before and matters more now these rows have public URLs: a database
 * blip should render an empty list or a 404, never a 500 on a page a crawler
 * is reading.
 */

/** A row as Postgres returns it. */
type Row = Record<string, unknown>;

/**
 * The single row-to-post mapper.
 *
 * Each read function used to write its own object literal, and two of them
 * quietly omitted `sources` — so the Sources block vanished on any by-id fetch
 * while working fine in the list. One mapper makes that class of bug
 * impossible rather than merely fixed.
 */
function rowToPost(row: Row): BlogPost {
  const slug = row.slug;

  return {
    id: String(row.id),
    ...(isValidSlug(slug) ? { slug } : {}),
    title: row.title as string,
    content: row.content as string,
    excerpt: row.excerpt as string,
    type: row.type as BlogPost['type'],
    topic: row.topic as string,
    metrics: (row.metrics ?? undefined) as BlogPost['metrics'],
    sources: (row.sources ?? undefined) as BlogPost['sources'],
    caseStudyLink: (row.case_study_link ?? undefined) as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    published: row.published as boolean,
  };
}

/**
 * Verifies the table exists.
 *
 * Kept because /api/init-db and the setup scripts call it. It has never
 * created anything — the schema is a migration, which is where schema belongs.
 */
export async function createBlogPostTable() {
  try {
    const sql = getSql();
    await sql`SELECT 1 FROM blog_posts LIMIT 1`;
    return { success: true };
  } catch (error) {
    console.error('Error verifying blog posts table:', error);
    return { success: true };
  }
}

export async function insertBlogPost(post: {
  title: string;
  content: string;
  excerpt: string;
  type: 'blog' | 'case-study';
  topic: string;
  metrics?: {
    percentage: number;
    description: string;
  };
  sources?: {
    title: string;
    url: string;
  }[];
  caseStudyLink?: string;
  published: boolean;
  /**
   * Assigned once, here, and never rewritten. See src/lib/blog/slug.ts and
   * guard rail N16 — changing a slug breaks every URL pointing at it.
   */
  slug: string;
}) {
  try {
    const sql = getSql();

    const rows = (await sql`
      INSERT INTO blog_posts (
        slug, title, content, excerpt, type, topic,
        metrics, sources, case_study_link, published
      )
      VALUES (
        ${post.slug},
        ${post.title},
        ${post.content},
        ${post.excerpt},
        ${post.type},
        ${post.topic},
        ${post.metrics ? JSON.stringify(post.metrics) : null},
        ${JSON.stringify(post.sources ?? [])},
        ${post.caseStudyLink ?? null},
        ${post.published}
      )
      RETURNING id, slug, created_at, updated_at
    `) as unknown as Row[];

    return rows[0];
  } catch (error) {
    // Rethrown rather than swallowed: a failed write must reach the caller. A
    // unique violation on slug lands here, which is the correct outcome — a
    // failed insert is recoverable, a duplicated URL is not.
    console.error('Error inserting blog post:', error);
    throw error;
  }
}

export async function getBlogPosts(limit: number = 10, offset: number = 0): Promise<BlogPost[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM blog_posts
      WHERE published = true
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as unknown as Row[];

    return rows.map(rowToPost);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM blog_posts WHERE id = ${id} AND published = true
    `) as unknown as Row[];

    return rows[0] ? rowToPost(rows[0]) : null;
  } catch (error) {
    console.error('Error fetching blog post by ID:', error);
    return null;
  }
}

export async function getLatestBlogPost(): Promise<BlogPost | null> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM blog_posts
      WHERE published = true
      ORDER BY created_at DESC
      LIMIT 1
    `) as unknown as Row[];

    return rows[0] ? rowToPost(rows[0]) : null;
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
    return null;
  }
}

/**
 * One published post by its slug.
 *
 * Returns null for an unknown slug, an unpublished one, and an unreachable
 * database alike. The route turns all three into a 404, which is the right
 * answer for a crawler in every case — a 500 is read as a site fault and
 * retried, a 404 is read as "not here" and dropped.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isValidSlug(slug)) return null;

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM blog_posts WHERE slug = ${slug} AND published = true
    `) as unknown as Row[];

    return rows[0] ? rowToPost(rows[0]) : null;
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    return null;
  }
}

/**
 * Slugs and modification times for every published post, for the sitemap.
 *
 * A row without a usable slug is skipped rather than guessed at: it has no
 * page, so advertising a URL for it would put a 404 in the sitemap.
 */
export async function getPublishedBlogSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT slug, updated_at FROM blog_posts
      WHERE published = true
      ORDER BY updated_at DESC
    `) as unknown as Row[];

    return rows.flatMap(row =>
      isValidSlug(row.slug)
        ? [{ slug: row.slug, updatedAt: new Date(row.updated_at as string) }]
        : []
    );
  } catch (error) {
    console.error('Error fetching published blog slugs:', error);
    return [];
  }
}

/**
 * Every slug already assigned, published or not.
 *
 * Feeds uniqueSlug at insert time. Unpublished rows count: their slug is still
 * held by the unique index, and a post can be republished later.
 */
export async function getAssignedSlugs(): Promise<Set<string>> {
  try {
    const sql = getSql();
    const rows = (await sql`SELECT slug FROM blog_posts`) as unknown as Row[];

    return new Set(rows.map(row => row.slug).filter(isValidSlug));
  } catch (error) {
    console.error('Error fetching assigned slugs:', error);
    // An empty set means uniqueSlug cannot disambiguate, so the unique index
    // becomes the backstop and the insert fails loudly. That is the right way
    // round: a failed insert is recoverable, a duplicate URL is not.
    return new Set();
  }
}

/** How many published posts exist, for paginating the index. */
export async function getPublishedBlogPostCount(): Promise<number> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT count(*)::int AS count FROM blog_posts WHERE published = true
    `) as unknown as Row[];

    return (rows[0]?.count as number) ?? 0;
  } catch (error) {
    console.error('Error counting blog posts:', error);
    return 0;
  }
}

/**
 * Deletes a post.
 *
 * Generation was once the only write path, so a row could not be taken back.
 * That was tolerable when posts had no URLs; now each one is a page, and
 * "publish" needs an inverse. Used by the admin route and by the end-to-end
 * spec, which creates a real post and would otherwise leave it behind.
 */
export async function deleteBlogPost(id: string): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`DELETE FROM blog_posts WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return false;
  }
}
