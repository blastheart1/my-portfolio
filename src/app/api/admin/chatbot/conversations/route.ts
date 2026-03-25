import { NextResponse } from 'next/server';
import { getSql } from '@/lib/neon';

export const runtime = 'nodejs';

// Admin-only: returns all conversation logs
// Protected by proxy middleware (route is under /api/admin/)
export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, session_id, messages, created_at, updated_at,
             jsonb_array_length(messages) AS message_count
      FROM chatbot_conversations
      ORDER BY updated_at DESC
      LIMIT 200
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/chatbot/conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
