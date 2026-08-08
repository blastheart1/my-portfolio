import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/require-admin';
import {
  getAllCredentialStatuses,
  setProviderKey,
  clearProviderKey,
  isProvider,
} from '@/lib/credentials-store';

/**
 * Provider API keys.
 *
 * Write-and-status only. There is deliberately no endpoint that returns a
 * stored key, to anyone, including an authenticated admin: the browser is the
 * least trustworthy place for it to be, and nothing in the UI needs it. You can
 * set a key and see its last four characters. Recovering it means going to the
 * provider's dashboard, which is the correct answer anyway.
 *
 * Node runtime: the crypto used to seal these is Node's, not WebCrypto.
 */
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    return NextResponse.json({ credentials: await getAllCredentialStatuses() });
  } catch (err) {
    console.error('GET /api/admin/credentials error:', err);
    return NextResponse.json({ error: 'Failed to read credentials' }, { status: 500 });
  }
}

const PutSchema = z.object({
  provider: z.string().min(1).max(50),
  // Generous upper bound: provider key formats change, and truncating a valid
  // key would fail in a way that looks like the provider rejecting it.
  key: z.string().min(8).max(500),
});

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    // The generic message is deliberate: echoing the parsed body back would
    // put the key in an error response, and from there into a log.
    return NextResponse.json(
      { error: 'A provider and a key of at least 8 characters are required' },
      { status: 400 }
    );
  }

  const { provider, key } = parsed.data;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: `Unknown provider "${provider}"` }, { status: 400 });
  }

  try {
    await setProviderKey(provider, key.trim());
    // Demo pages read credentials at request time, but the /work index caches
    // for 60s; nudging it keeps a newly configured provider from looking
    // broken for a minute.
    revalidatePath('/work');
    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    // Log the shape of the failure, never the payload.
    console.error(`PUT /api/admin/credentials error for "${provider}":`, err);
    return NextResponse.json({ error: 'Failed to save the key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const provider = new URL(request.url).searchParams.get('provider') ?? '';
  if (!isProvider(provider)) {
    return NextResponse.json({ error: `Unknown provider "${provider}"` }, { status: 400 });
  }

  try {
    await clearProviderKey(provider);
    revalidatePath('/work');
    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    console.error(`DELETE /api/admin/credentials error for "${provider}":`, err);
    return NextResponse.json({ error: 'Failed to clear the key' }, { status: 500 });
  }
}
