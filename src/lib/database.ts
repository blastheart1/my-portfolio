import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BlogPost } from '@/types/blog';
import { isValidSlug } from '@/lib/blog/slug';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;
let writeClient: SupabaseClient | null = null;

/**
 * NOTE: the blog is the last thing still on Supabase — everything else in this
 * app uses Neon (src/lib/neon.ts). Consolidating onto Neon is worth doing; it
 * needs a schema + data migration, so it is deliberately not bundled here.
 *
 * This previously returned a client pointed at https://mock.supabase.co when
 * the env vars were missing, which meant every blog read and write failed
 * silently and looked like "no posts yet". Misconfiguration now throws, and
 * callers (which all wrap this in try/catch) surface it in logs instead of
 * pretending the database is simply empty.
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and ' +
          'NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set for blog features. ' +
          '(These two are publishable by design — the anon key is protected by RLS.)'
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Client for writes.
 *
 * Every write above ran with the anon key, which is inlined into the client
 * bundle. That is only safe if RLS forbids anonymous INSERT and UPDATE on
 * blog_posts — a claim this codebase asserts (see the allow-list note in
 * src/lib/__tests__/no-public-secrets.test.ts) and has never verified. Once
 * these rows have public URLs, an unrestricted write is a way to publish
 * arbitrary indexed content on the domain.
 *
 * So writes prefer a server-only service-role key. It falls back to the anon
 * client rather than throwing, because hard-failing here would stop the
 * content cron the moment this shipped and before the env var was set — but
 * the fallback is loud, because a silent one would leave the situation exactly
 * as it was while looking fixed.
 */
function getSupabaseWriteClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    console.warn(
      '[database] SUPABASE_SERVICE_ROLE_KEY is not set — blog writes are ' +
        'running with the publishable anon key. If RLS permits anonymous ' +
        'INSERT or UPDATE on blog_posts, anyone holding that key can publish ' +
        'to the site. Set the service-role key and lock the anon policies to ' +
        'SELECT WHERE published = true.'
    );
    return getSupabaseClient();
  }

  if (!writeClient) {
    writeClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return writeClient;
}

/**
 * The single row-to-post mapper.
 *
 * Previously each read function wrote its own object literal, and two of them
 * (getBlogPostById, getLatestBlogPost) quietly omitted `sources` — so the
 * Sources block vanished on any by-id fetch while working fine in the list.
 * One mapper makes that class of bug impossible rather than merely fixed.
 *
 * `slug` is read defensively. The column is added by hand in the Supabase
 * console, so a deploy can precede the migration; a row without one yields a
 * post with no page instead of an exception.
 */
function rowToPost(row: Record<string, unknown>): BlogPost {
  const slug = row.slug;

  return {
    id: row.id as string,
    ...(isValidSlug(slug) ? { slug } : {}),
    title: row.title as string,
    content: row.content as string,
    excerpt: row.excerpt as string,
    type: row.type as BlogPost['type'],
    topic: row.topic as string,
    metrics: row.metrics as BlogPost['metrics'],
    sources: row.sources as BlogPost['sources'],
    caseStudyLink: (row.case_study_link ?? undefined) as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    published: row.published as boolean,
  };
}

export async function createBlogPostTable() {
  try {
    const client = getSupabaseClient();
    // Table is already created via SQL editor, just verify it exists
    const { error } = await client
      .from('blog_posts')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying blog posts table:', error);
    // During build time or when using mock client, return success
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
   * guard rail N16 — changing a slug breaks every URL already pointing at it.
   */
  slug: string;
}) {
  try {
    const client = getSupabaseWriteClient();
        const { data, error } = await client
          .from('blog_posts')
          .insert([{
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            type: post.type,
            topic: post.topic,
            metrics: post.metrics,
            sources: post.sources || [],
            case_study_link: post.caseStudyLink,
            published: post.published,
            slug: post.slug
          }])
      .select('id, slug, created_at, updated_at')
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting blog post:', error);
    throw error;
  }
}

export async function getBlogPosts(limit: number = 10, offset: number = 0): Promise<BlogPost[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data.map(rowToPost);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    // During build time or when using mock client, return empty array
    return [];
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .eq('published', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    
    return rowToPost(data);
  } catch (error) {
    console.error('Error fetching blog post by ID:', error);
    return null;
  }
}

export async function getLatestBlogPost(): Promise<BlogPost | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    
    return rowToPost(data);
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
    return null;
  }
}
/**
 * One published post by its slug.
 *
 * Returns null for an unknown slug, an unpublished one, or an unreachable
 * database. The route turns that into a 404, which is the right answer for a
 * crawler in every one of those cases — a 500 on a crawled URL is read as a
 * site problem and retried, a 404 is read as "not here" and dropped.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isValidSlug(slug)) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

    return rowToPost(data);
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    return null;
  }
}

/**
 * Slugs and modification times for every published post, for the sitemap.
 *
 * Rows with no slug are skipped rather than guessed at: they have no page, so
 * advertising a URL for them would put a 404 in the sitemap.
 */
export async function getPublishedBlogSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).flatMap(row =>
      isValidSlug(row.slug)
        ? [{ slug: row.slug, updatedAt: new Date(row.updated_at as string) }]
        : []
    );
  } catch (error) {
    // Includes the case where the slug column does not exist yet, because the
    // migration is applied by hand and may lag the deploy. The sitemap then
    // carries its static entries and no blog URLs, which is correct.
    console.error('Error fetching published blog slugs:', error);
    return [];
  }
}

/**
 * Every slug already assigned, published or not.
 *
 * Feeds uniqueSlug at insert time. Unpublished rows count: a slug they hold is
 * still taken by the unique index, and a post can be republished later.
 */
export async function getAssignedSlugs(): Promise<Set<string>> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('blog_posts').select('slug');

    if (error) throw error;

    return new Set((data ?? []).map(row => row.slug).filter(isValidSlug));
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
    const client = getSupabaseClient();
    const { count, error } = await client
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('published', true);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Error counting blog posts:', error);
    return 0;
  }
}

/**
 * Deletes a post.
 *
 * Added for the end-to-end revalidation spec, which creates a real post
 * through the real API and would otherwise leave it in the production table
 * on every run. Uses the write client for the same reason the insert does.
 */
export async function deleteBlogPost(id: string): Promise<boolean> {
  try {
    const client = getSupabaseWriteClient();
    const { error } = await client.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return false;
  }
}
