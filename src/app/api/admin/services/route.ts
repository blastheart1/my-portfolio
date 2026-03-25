import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM service_tiers ORDER BY sort_order ASC`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/services error:', err);
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }
}

const TierSchema = z.object({
  name:       z.string().min(1).max(50),
  tagline:    z.string().max(80).optional().default(''),
  outcome:    z.string().max(300).optional().default(''),
  price_php:  z.number().int().min(0),
  price_usd:  z.number().int().min(0),
  features:   z.array(z.string().max(100)).max(8).default([]),
  is_popular: z.boolean().default(false),
  visible:    z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = TierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const sql = getSql();
    const d = parsed.data;
    const rows = (await sql`
      INSERT INTO service_tiers (name, tagline, outcome, price_php, price_usd, features, is_popular, visible, sort_order)
      VALUES (${d.name}, ${d.tagline}, ${d.outcome}, ${d.price_php}, ${d.price_usd},
              ${d.features as string[]}, ${d.is_popular}, ${d.visible}, ${d.sort_order})
      RETURNING *
    `) as unknown as Record<string, unknown>[];
    revalidatePath('/');
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/services error:', err);
    return NextResponse.json({ error: 'Failed to create tier' }, { status: 500 });
  }
}
