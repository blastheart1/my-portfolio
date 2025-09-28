import { sql } from '@vercel/postgres';
import { BlogPost } from '@/types/blog';

export async function createBlogPostTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('blog', 'case-study')),
        topic VARCHAR(100) NOT NULL,
        metrics JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        published BOOLEAN DEFAULT true
      );
    `;
    console.log('Blog posts table created successfully');
  } catch (error) {
    console.error('Error creating blog posts table:', error);
    throw error;
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
  published: boolean;
}) {
  try {
    const result = await sql`
      INSERT INTO blog_posts (title, content, excerpt, type, topic, metrics, published)
      VALUES (${post.title}, ${post.content}, ${post.excerpt}, ${post.type}, ${post.topic}, ${post.metrics ? JSON.stringify(post.metrics) : null}, ${post.published})
      RETURNING id, created_at, updated_at;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting blog post:', error);
    throw error;
  }
}

export async function getBlogPosts(limit: number = 10, offset: number = 0): Promise<BlogPost[]> {
  try {
    const result = await sql`
      SELECT * FROM blog_posts 
      WHERE published = true 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset};
    `;
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      type: row.type,
      topic: row.topic,
      metrics: row.metrics,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      published: row.published
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const result = await sql`
      SELECT * FROM blog_posts 
      WHERE id = ${id} AND published = true;
    `;
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      type: row.type,
      topic: row.topic,
      metrics: row.metrics,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      published: row.published
    } as BlogPost;
  } catch (error) {
    console.error('Error fetching blog post by ID:', error);
    throw error;
  }
}

export async function getLatestBlogPost(): Promise<BlogPost | null> {
  try {
    const result = await sql`
      SELECT * FROM blog_posts 
      WHERE published = true 
      ORDER BY created_at DESC 
      LIMIT 1;
    `;
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      type: row.type,
      topic: row.topic,
      metrics: row.metrics,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      published: row.published
    } as BlogPost;
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
    throw error;
  }
}