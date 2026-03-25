import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM ai_config ORDER BY provider, model`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/chatbot/config error:', err);
    return NextResponse.json({ error: 'Failed to fetch AI configs' }, { status: 500 });
  }
}

const ActivateSchema = z.object({
  id: z.string().uuid(),
});

// PATCH: set a config as the active one (deactivates all others)
export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const sql = getSql();
    // Deactivate all, then activate the requested one
    await sql`UPDATE ai_config SET active = false, updated_at = now()`;
    const rows = (await sql`
      UPDATE ai_config
      SET active = true, updated_at = now()
      WHERE id = ${parsed.data.id}
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    if (!rows.length) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/admin/chatbot/config error:', err);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(50).max(4000).optional(),
  use_knowledge: z.boolean().optional(),
  system_prompt_override: z.string().max(8000).nullable().optional(),
});

// PUT: update editable fields on a config row
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, temperature, max_tokens, use_knowledge, system_prompt_override } = parsed.data;

  try {
    const sql = getSql();
    const rows = (await sql`
      UPDATE ai_config SET
        temperature            = COALESCE(${temperature ?? null}, temperature),
        max_tokens             = COALESCE(${max_tokens ?? null}, max_tokens),
        use_knowledge          = COALESCE(${use_knowledge ?? null}, use_knowledge),
        system_prompt_override = ${system_prompt_override !== undefined ? system_prompt_override : null},
        updated_at             = now()
      WHERE id = ${id}
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    if (!rows.length) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/admin/chatbot/config error:', err);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
