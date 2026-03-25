import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM sections ORDER BY sort_order`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/sections error:', err);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

const PatchSchema = z.union([
  z.object({
    sectionId: z.string().min(1).max(50),
    visible: z.boolean(),
  }),
  z.object({
    order: z.array(z.string().min(1).max(50)).min(1).max(20),
  }),
]);

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const sql = getSql();
    if ('order' in parsed.data) {
      // Update sort order
      for (let i = 0; i < parsed.data.order.length; i++) {
        await sql`
          UPDATE sections SET sort_order = ${i}, updated_at = now()
          WHERE id = ${parsed.data.order[i]}
        `;
      }
    } else {
      // Update visibility
      await sql`
        UPDATE sections SET visible = ${parsed.data.visible}, updated_at = now()
        WHERE id = ${parsed.data.sectionId}
      `;
    }

    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/admin/sections error:', err);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}
