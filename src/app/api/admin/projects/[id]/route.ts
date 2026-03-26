import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tech: z.array(z.string().max(100)).optional(),
  link: z.string().max(500).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
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

    const rows = (await sql`
      UPDATE projects SET
        title       = COALESCE(${d.title ?? null}, title),
        description = CASE WHEN ${d.description !== undefined} THEN ${d.description ?? null} ELSE description END,
        tech        = COALESCE(${d.tech !== undefined ? d.tech : null}, tech),
        link        = CASE WHEN ${d.link !== undefined} THEN ${d.link ?? null} ELSE link END,
        image_url   = CASE WHEN ${d.image_url !== undefined} THEN ${d.image_url ?? null} ELSE image_url END,
        sort_order  = COALESCE(${d.sort_order ?? null}, sort_order),
        visible     = COALESCE(${d.visible ?? null}, visible),
        updated_at  = now()
      WHERE id = ${id}::uuid
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/admin/projects/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
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
      DELETE FROM projects WHERE id = ${id}::uuid RETURNING id
    `) as unknown as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/projects/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
