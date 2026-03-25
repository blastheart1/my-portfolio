import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSql } from '@/lib/neon';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`SELECT * FROM media_assets ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/images error:', err);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const label = formData.get('label');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  // Sanitize filename — strip path traversal, keep alphanumeric + safe chars
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

  try {
    const blob = await put(`portfolio/${safeName}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    const sql = getSql();
    const rows = (await sql`
      INSERT INTO media_assets (label, url, blob_pathname, mime_type, size_bytes)
      VALUES (
        ${typeof label === 'string' ? label.slice(0, 100) : safeName},
        ${blob.url},
        ${blob.pathname},
        ${file.type},
        ${file.size}
      )
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/images error:', err);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
