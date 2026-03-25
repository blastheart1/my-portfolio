import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { requireAdmin } from '@/lib/require-admin';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  approved: z.boolean().optional(),
  tag: z.string().max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = await params;

  try {
    const sql = getSql();
    const { approved, tag } = parsed.data;
    const rows = (await sql`
      UPDATE chatbot_examples SET
        approved = COALESCE(${approved ?? null}, approved),
        tag      = COALESCE(${tag ?? null}, tag)
      WHERE id = ${id}
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/chatbot/examples/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update example' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const sql = getSql();
    await sql`DELETE FROM chatbot_examples WHERE id = ${id}`;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/chatbot/examples/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete example' }, { status: 500 });
  }
}
