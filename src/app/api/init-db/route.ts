import { NextRequest, NextResponse } from 'next/server';
import { createBlogPostTable } from '@/lib/database';
import { timingSafeCompare } from '@/lib/admin-auth';

// Bootstrap endpoint. Kept (rather than deleted) because scripts/setup-blog.js,
// scripts/setup-database.js and scripts/setup-supabase.js drive schema creation
// through it. It is idempotent DDL, but it stays CRON_SECRET-gated and fails
// closed when that secret is unset.
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || !timingSafeCompare(authHeader ?? undefined, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await createBlogPostTable();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}