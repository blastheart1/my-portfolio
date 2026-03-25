import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const VALID_SECTIONS = ['hero', 'about', 'experience', 'skills', 'projects', 'services', 'blog', 'contact'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Unknown section' }, { status: 404 });
  }

  try {
    const sql = getSql();
    type Row = { field_key: string; field_value: string | null };
    const rows = (await sql`
      SELECT field_key, field_value FROM section_content WHERE section_id = ${section}
    `) as unknown as Row[];
    const content = Object.fromEntries(rows.map((r) => [r.field_key, r.field_value ?? '']));
    return NextResponse.json(content);
  } catch (err) {
    console.error(`GET /api/admin/content/${section} error:`, err);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  fields: z.record(z.string().min(1).max(100), z.string().max(10000)),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Unknown section' }, { status: 404 });
  }

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
    for (const [key, value] of Object.entries(parsed.data.fields)) {
      await sql`
        INSERT INTO section_content (section_id, field_key, field_value)
        VALUES (${section}, ${key}, ${value})
        ON CONFLICT (section_id, field_key)
        DO UPDATE SET field_value = ${value}, updated_at = now()
      `;
    }
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/admin/content/${section} error:`, err);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
