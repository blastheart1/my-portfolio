import { NextResponse } from 'next/server';

import { getAllCredentialStatuses, PROVIDER_LABELS } from '@/lib/credentials-store';

/**
 * Which model providers the demo can actually use.
 *
 * Returns provider names and labels only — never key material, and never the
 * masked tail either, since a public endpoint has no business hinting at the
 * shape of a secret.
 *
 * Listing only configured providers is also the cost control: a visitor cannot
 * route the quota to a vendor whose key was deliberately not set.
 */
export const runtime = 'nodejs';

export async function GET() {
  try {
    const statuses = await getAllCredentialStatuses();

    return NextResponse.json({
      providers: statuses
        .filter(s => s.source !== 'missing')
        .map(s => ({ id: s.provider, label: PROVIDER_LABELS[s.provider] })),
    });
  } catch (err) {
    console.error('GET /api/demo/models error:', err);
    // An empty list degrades to "no provider configured", which the demo
    // already handles by returning a stored example.
    return NextResponse.json({ providers: [] });
  }
}
