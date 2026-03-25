import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  name:       z.string().min(1).max(50).optional(),
  tagline:    z.string().max(80).optional(),
  outcome:    z.string().max(300).optional(),
  price_php:  z.number().int().min(0).optional(),
  price_usd:  z.number().int().min(0).optional(),
  features:   z.array(z.string().max(100)).max(8).optional(),
  is_popular: z.boolean().optional(),
  visible:    z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const sql = getSql();
    const d = parsed.data;
    const rows = (await sql`
      UPDATE service_tiers SET
        name        = COALESCE(${d.name ?? null}, name),
        tagline     = COALESCE(${d.tagline ?? null}, tagline),
        outcome     = COALESCE(${d.outcome ?? null}, outcome),
        price_php   = COALESCE(${d.price_php ?? null}, price_php),
        price_usd   = COALESCE(${d.price_usd ?? null}, price_usd),
        features    = COALESCE(${d.features as string[] ?? null}, features),
        is_popular  = COALESCE(${d.is_popular ?? null}, is_popular),
        visible     = COALESCE(${d.visible ?? null}, visible),
        sort_order  = COALESCE(${d.sort_order ?? null}, sort_order),
        updated_at  = now()
      WHERE id = ${id}
      RETURNING *
    `) as unknown as Record<string, unknown>[];
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    revalidatePath('/');
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/admin/services/${id} error:`, err);
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sql = getSql();
    await sql`DELETE FROM service_tiers WHERE id = ${id}`;
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/admin/services/${id} error:`, err);
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
  }
}
