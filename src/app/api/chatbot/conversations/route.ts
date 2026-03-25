import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';

export const runtime = 'nodejs';

const MessageSchema = z.object({
  id: z.string(),
  content: z.string().max(5000),
  isUser: z.boolean(),
  timestamp: z.string(),
  source: z.string().optional(),
});

const BodySchema = z.object({
  session_id: z.string().uuid(),
  messages: z.array(MessageSchema).max(200),
});

// Upsert conversation log (opt-in only — caller must have consent)
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { session_id, messages } = parsed.data;

  try {
    const sql = getSql();
    const messagesJson = JSON.stringify(messages);
    await sql`
      INSERT INTO chatbot_conversations (session_id, messages, updated_at)
      VALUES (${session_id}, ${messagesJson}::jsonb, now())
      ON CONFLICT (session_id)
      DO UPDATE SET messages = ${messagesJson}::jsonb, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/chatbot/conversations error:', err);
    return NextResponse.json({ error: 'Failed to save conversation' }, { status: 500 });
  }
}
