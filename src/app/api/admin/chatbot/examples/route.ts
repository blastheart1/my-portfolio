import { NextResponse } from 'next/server';
import { getSql } from '@/lib/neon';

export const runtime = 'nodejs';

// Admin-only: returns ALL examples including unapproved
// Protected by proxy middleware (route is under /api/admin/)
export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM chatbot_examples ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/chatbot/examples error:', err);
    return NextResponse.json({ error: 'Failed to fetch examples' }, { status: 500 });
  }
}
