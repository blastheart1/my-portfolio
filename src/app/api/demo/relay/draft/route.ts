import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withDemoQuota } from '@/lib/demo-visitor';
import { isDemoVisible } from '@/lib/content-queries';
import { findSeedNote } from '@/lib/demo/relay/seed';
import { runDraftPipeline, MAX_TRANSCRIPT_CHARS } from '@/lib/demo/relay/pipeline';
import type { DemoNote } from '@/lib/demo/relay/types';

/**
 * Drafts a reply from a voice note.
 *
 * The one endpoint here that spends money, so it carries the quota. Visibility
 * is checked too: switching the section off in /edit must stop the spending,
 * not just hide the page that calls this.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

const BodySchema = z.object({
  noteId: z.string().min(1).max(100).optional(),
  transcript: z.string().min(1).max(MAX_TRANSCRIPT_CHARS).optional(),
  correspondent: z.string().min(1).max(80).optional(),
  tone: z.enum(['Warm', 'Neutral', 'Direct']).optional(),
  length: z.enum(['Concise', 'Standard', 'Detailed']).optional(),
});

export const POST = withDemoQuota('relay', async (request: NextRequest) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Send a transcript of up to ${MAX_TRANSCRIPT_CHARS} characters.` },
      { status: 400 }
    );
  }

  const { noteId, transcript, correspondent, tone, length } = parsed.data;

  // Either replay a seeded note or draft from something the visitor captured.
  const seed = noteId ? findSeedNote(noteId) : undefined;
  if (noteId && !seed) {
    return NextResponse.json({ error: 'Unknown note' }, { status: 404 });
  }

  const note: DemoNote | undefined = seed
    ? { ...seed, tone: tone ?? seed.tone, length: length ?? seed.length }
    : transcript
      ? {
          id: 'captured',
          // A visitor's own recording is a note like any other, so it carries
          // the same fields the inbox rows use. These were added to DemoNote
          // for the inbox and this construction was missed, which is what
          // broke the deploy.
          kind: 'Note',
          captured: 'Just now',
          correspondent: correspondent?.trim() || 'there',
          context: 'Captured in the demo',
          transcript,
          suggestedSubject: 'Following up',
          tone: tone ?? 'Warm',
          length: length ?? 'Standard',
        }
      : undefined;

  if (!note) {
    return NextResponse.json({ error: 'Send a noteId or a transcript' }, { status: 400 });
  }

  return NextResponse.json(await runDraftPipeline(note));
},
  // Visibility is checked before any quota is spent: switching the demo off in
  // /edit must stop the spending, and a request to a hidden demo must not cost
  // the visitor a run.
  async () =>
    (await isDemoVisible('demo_relay'))
      ? null
      : NextResponse.json({ error: 'Not found' }, { status: 404 })
);
