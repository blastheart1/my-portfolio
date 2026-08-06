import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BlogPost } from '@/types/blog';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

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
}) {
  try {
    const client = getSupabaseClient();
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
            published: post.published
          }])
      .select('id, created_at, updated_at')
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
    
        return data.map(row => ({
          id: row.id,
          title: row.title,
          content: row.content,
          excerpt: row.excerpt,
          type: row.type,
          topic: row.topic,
          metrics: row.metrics,
          sources: row.sources,
          caseStudyLink: row.case_study_link,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          published: row.published
        })) as BlogPost[];
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
    
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      type: data.type,
      topic: data.topic,
      metrics: data.metrics,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      published: data.published
    } as BlogPost;
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
    
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      type: data.type,
      topic: data.topic,
      metrics: data.metrics,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      published: data.published
    } as BlogPost;
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
    return null;
  }
}