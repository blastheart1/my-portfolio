import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getSql } from '@/lib/neon';

export const runtime = 'nodejs';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const sql = getSql();

    // Fetch the asset first to get blob_pathname
    const rows = (await sql`SELECT * FROM media_assets WHERE id = ${id}::uuid`) as unknown as { blob_pathname: string }[];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = rows[0];

    // Delete from Vercel Blob store
    await del(asset.blob_pathname);

    // Remove DB record
    await sql`DELETE FROM media_assets WHERE id = ${id}::uuid`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/images/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
