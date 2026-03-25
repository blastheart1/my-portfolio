import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { checkGuardRails, logGuardRailEvent } from '@/lib/chatbot/guardRails';

export const runtime = 'nodejs';

// ─── GET — public, returns only approved examples for TF.js init ─────────────

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, user_input, ai_response, tag, created_at
      FROM chatbot_examples
      WHERE approved = true
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/chatbot/examples error:', err);
    return NextResponse.json([], { status: 200 }); // graceful empty on error
  }
}

// ─── Rate limiter (per-IP, server memory) ────────────────────────────────────

const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 20;
const HOUR_MS = 3_600_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + HOUR_MS });
    return false;
  }
  if (bucket.count >= MAX_PER_HOUR) return true;
  bucket.count++;
  return false;
}

// ─── POST — public, saves new learned example (unapproved) ───────────────────

const ExampleSchema = z.object({
  user_input: z.string().min(1).max(2000),
  ai_response: z.string().min(1).max(5000),
  tag: z.string().max(100).optional().default(''),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many examples saved. Please slow down.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ExampleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // ── Guard Rail: DB write protection ────────────────────────────────────────
  // Injection patterns must not be saved as training examples — they would be
  // trained into TF.js and served as responses when approved.
  const inputGuard = checkGuardRails(parsed.data.user_input);
  const responseGuard = checkGuardRails(parsed.data.ai_response);
  if (inputGuard.tier === 'BLOCK' || responseGuard.tier === 'BLOCK') {
    const flagged = inputGuard.tier === 'BLOCK' ? inputGuard : responseGuard;
    logGuardRailEvent(flagged, {
      source: 'db_write',
      userInput: parsed.data.user_input,
      ip,
    });
    return NextResponse.json(
      { error: 'Content flagged for review.' },
      { status: 400 }
    );
  }

  try {
    const sql = getSql();
    const { user_input, ai_response, tag } = parsed.data;
    const rows = (await sql`
      INSERT INTO chatbot_examples (user_input, ai_response, tag, approved)
      VALUES (${user_input}, ${ai_response}, ${tag}, false)
      RETURNING id, user_input, ai_response, tag, approved, created_at
    `) as unknown as Record<string, unknown>[];
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/chatbot/examples error:', err);
    return NextResponse.json({ error: 'Failed to save example' }, { status: 500 });
  }
}
