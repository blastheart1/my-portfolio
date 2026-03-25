import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    type Row = { field_key: string; field_value: string | null };
    const rows = (await sql`
      SELECT field_key, field_value FROM section_content WHERE section_id = 'settings'
    `) as unknown as Row[];
    return NextResponse.json(
      Object.fromEntries(rows.map(r => [r.field_key, r.field_value ?? '']))
    );
  } catch (err) {
    console.error('GET /api/admin/settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  key:   z.string().min(1).max(100),
  value: z.string().max(500),
});

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  try {
    const sql = getSql();
    await sql`
      INSERT INTO section_content (section_id, field_key, field_value)
      VALUES ('settings', ${parsed.data.key}, ${parsed.data.value})
      ON CONFLICT (section_id, field_key)
      DO UPDATE SET field_value = ${parsed.data.value}, updated_at = now()
    `;
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/admin/settings error:', err);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
