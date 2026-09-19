import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { runContentPipeline } from '@/lib/blog/pipeline';
import { getBlogPosts } from '@/lib/database';
import { submitToIndexNow } from '@/lib/indexnow';
import { getRandomTopic, shouldGenerateCaseStudy } from '@/lib/openai-service';
import { requireAdmin } from '@/lib/require-admin';

// Admin-only: this endpoint spends AI provider budget AND publishes to the
// live blog. The scheduled path is /api/cron/generate-content, which is
// separately guarded by CRON_SECRET and does not go through here.
//
// Generation no longer writes directly. Everything goes through the publish
// gate in src/lib/blog/pipeline.ts — see guard rail N10. A draft the gate
// rejects is a 200 with published:false and the reasons, not an error: the
// endpoint did its job, the post was not good enough.

/** The audit and the source-link checks add several seconds to a generation. */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    // A body is optional here, so a malformed or absent one is a default
    // rather than a 500.
    const body = await request.json().catch(() => ({}));
    const { topic, type } = body ?? {};

    // Recent content, both to steer away from repetition in the prompt and to
    // catch a near-duplicate title in the gate.
    const recentPosts = await getBlogPosts(20);

    const outcome = await runContentPipeline({
      topic: topic || getRandomTopic(),
      type: (type || (shouldGenerateCaseStudy() ? 'case-study' : 'blog')) as 'blog' | 'case-study',
      previousContent: recentPosts,
    });

    if (!outcome.published) {
      return NextResponse.json({
        success: true,
        published: false,
        reasons: outcome.reasons,
        attempts: outcome.attempts,
      });
    }

    await propagate(outcome.slug!);

    return NextResponse.json({
      success: true,
      published: true,
      post: { id: outcome.id, slug: outcome.slug },
      // Surfaced rather than swallowed: a downgraded case study is something
      // the person who triggered this should know about.
      notes: outcome.reasons,
      downgraded: outcome.downgraded,
    });
  } catch (error) {
    console.error('Error generating blog content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

/**
 * Invalidates the pages a new post appears on, then tells the search engines.
 *
 * Order matters. Submitting a URL that still 404s because revalidation has not
 * run teaches the IndexNow endpoints that this feed is unreliable, and the
 * cost of that is paid on every later submission.
 */
async function propagate(slug: string): Promise<void> {
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');
  await submitToIndexNow([`/blog/${slug}`, '/blog']);
}
