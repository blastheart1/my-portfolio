import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSql } from '@/lib/neon';
import { requireAdmin } from '@/lib/require-admin';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

// PDFs go through the same media library so the resume can be replaced from
// the admin instead of being a file committed to public/ and redeployed.
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
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
  const denied = await requireAdmin(request);
  if (denied) return denied;
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

  // put() reads this from the environment and throws an opaque error when it
  // is absent, which surfaced as a bare 500 with nothing to act on. Check it
  // here so a missing Blob store says so.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('POST /api/admin/images: BLOB_READ_WRITE_TOKEN is not set');
    return NextResponse.json(
      {
        error:
          'File storage is not configured on this deployment (BLOB_READ_WRITE_TOKEN is missing). Connect a Blob store to the project and redeploy.',
      },
      { status: 500 }
    );
  }

  try {
    const blob = await put(`portfolio/${safeName}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    const sql = getSql();
    // label is UNIQUE and the callers use it as a stable handle — the resume
    // uploader always sends 'resume'. Replacing a file must therefore update
    // the existing row rather than insert a second one, which is what made
    // every upload after the first fail with a 23505 unique violation.
    // created_at is bumped so the media list still orders by recency.
    const rows = (await sql`
      INSERT INTO media_assets (label, url, blob_pathname, mime_type, size_bytes)
      VALUES (
        ${typeof label === 'string' ? label.slice(0, 100) : safeName},
        ${blob.url},
        ${blob.pathname},
        ${file.type},
        ${file.size}
      )
      ON CONFLICT (label) DO UPDATE SET
        url           = EXCLUDED.url,
        blob_pathname = EXCLUDED.blob_pathname,
        mime_type     = EXCLUDED.mime_type,
        size_bytes    = EXCLUDED.size_bytes,
        created_at    = now()
      RETURNING *
    `) as unknown as Record<string, unknown>[];

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/images error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Upload failed: ${err.message}`
            : 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}
