import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM projects ORDER BY sort_order ASC`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/projects error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

const ProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tech: z.array(z.string().max(100)).optional(),
  link: z.string().max(500).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
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
