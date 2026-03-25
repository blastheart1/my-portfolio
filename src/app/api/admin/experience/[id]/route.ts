import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  track: z.string().min(1).max(50).optional(),
  role: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  detail_body: z.string().max(5000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const d = parsed.data;

    // Build dynamic SET clauses using individual conditional updates
    const rows = (await sql`
      UPDATE experience_entries SET
        track       = COALESCE(${d.track ?? null}, track),
        role        = COALESCE(${d.role ?? null}, role),
        company     = COALESCE(${d.company ?? null}, company),
        description = CASE WHEN ${d.description !== undefined} THEN ${d.description ?? null} ELSE description END,
        start_date  = COALESCE(${d.start_date ?? null}, start_date),
        end_date    = CASE WHEN ${d.end_date !== undefined} THEN ${d.end_date ?? null} ELSE end_date END,
        sort_order  = COALESCE(${d.sort_order ?? null}, sort_order),
        visible     = COALESCE(${d.visible ?? null}, visible),
        detail_body = CASE WHEN ${d.detail_body !== undefined} THEN ${d.detail_body ?? null} ELSE detail_body END,
        updated_at  = now()
      WHERE id = ${id}::uuid
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/admin/experience/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const sql = getSql();
    const rows = (await sql`
      DELETE FROM experience_entries WHERE id = ${id}::uuid RETURNING id
    `) as unknown as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/experience/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
