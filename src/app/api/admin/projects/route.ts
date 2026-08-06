import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { ProjectSchema } from '@/lib/schemas/projects';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM projects ORDER BY sort_order ASC`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/projects error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const sql = getSql();
    const { title, description, tech, link, image_url, sort_order, visible } = parsed.data;
    const rows = (await sql`
      INSERT INTO projects (title, description, tech, link, image_url, sort_order, visible)
      VALUES (
        ${title},
        ${description ?? null},
        ${tech ?? []},
        ${link ?? null},
        ${image_url ?? null},
        ${sort_order ?? 0},
        ${visible ?? true}
      )
      RETURNING *
    `) as unknown as Record<string, unknown>[];
    revalidatePath('/');
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/projects error:', err);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
