import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { ExperienceSchema as EntrySchema } from '@/lib/schemas/experience';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM experience_entries ORDER BY start_date DESC, sort_order ASC`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/experience error:', err);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = EntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const sql = getSql();
    const { track, role, company, description, start_date, end_date, sort_order, visible, detail_body } = parsed.data;
    const rows = (await sql`
      INSERT INTO experience_entries (track, role, company, description, start_date, end_date, sort_order, visible, detail_body)
      VALUES (${track}, ${role}, ${company}, ${description ?? null}, ${start_date}, ${end_date ?? null},
              ${sort_order ?? 0}, ${visible ?? true}, ${detail_body ?? null})
      RETURNING *
    `) as unknown as Record<string, unknown>[];
    revalidatePath('/');
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/experience error:', err);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
