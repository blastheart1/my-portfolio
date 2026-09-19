import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { runContentPipeline } from '@/lib/blog/pipeline';
import { getRandomTopic, shouldGenerateCaseStudy } from '@/lib/openai-service';
import { timingSafeCompare } from '@/lib/admin-auth';
import { getBlogPosts, getLatestBlogPost } from '@/lib/database';
import { submitToIndexNow } from '@/lib/indexnow';

/**
 * The scheduled content run.
 *
 * Nothing is written directly any more: generation goes through the publish
 * gate in src/lib/blog/pipeline.ts, which screens, verifies every cited link,
 * and has a model from another vendor audit the draft before it is allowed
 * near the database. See guard rail N10.
 *
 * A rejection returns 200 with the reasons in the body. This route's normal
 * state is already "success, did nothing" — it skips whenever the latest post
 * is under two days old — so a failure status would be noise, and the reasons
 * in the body are the only way anyone learns why a week produced no posts.
 */

/** A generation is now a draft, a source check and an audit, not one call. */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request. Constant-time compare so the
    // secret cannot be recovered byte-by-byte from response timing.
    // Fail closed when CRON_SECRET is unset — otherwise a literal "Bearer "
    // header would authenticate against an empty secret.
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || !timingSafeCompare(authHeader ?? undefined, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we already generated content today
    const latestPost = await getLatestBlogPost();
    const now = new Date();
    const latestPostDate = latestPost ? new Date(latestPost.createdAt) : new Date(0);
    
    // If latest post is less than 2 days old, skip generation
    const daysSinceLastPost = (now.getTime() - latestPostDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPost < 2) {
      return NextResponse.json({
        success: true,
        message: 'Content already generated recently, skipping...',
        daysSinceLastPost: Math.round(daysSinceLastPost)
      });
    }

    // Recent content, both to steer the prompt away from repetition and to
    // give the gate something to compare a near-duplicate title against.
    const recentPosts = await getBlogPosts(20);
    
    const contentRequest = {
      topic: getRandomTopic(),
      type: (shouldGenerateCaseStudy() ? 'case-study' : 'blog') as 'blog' | 'case-study',
      previousContent: recentPosts
    };

    const outcome = await runContentPipeline(contentRequest);

    if (!outcome.published) {
      // Logged as well as returned. The response body of a cron run is not
      // somewhere anyone looks until they wonder why nothing has published.
      console.warn('[cron] draft rejected by the publish gate:', outcome.reasons);
      return NextResponse.json({
        success: true,
        published: false,
        message: 'Draft rejected by the publish gate',
        reasons: outcome.reasons,
        attempts: outcome.attempts,
      });
    }

    // Invalidate before submitting. A URL pinged while it still 404s teaches
    // the IndexNow endpoints to distrust this feed, and awaited rather than
    // fired and forgotten because a serverless instance may freeze the moment
    // the response returns.
    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath('/sitemap.xml');
    await submitToIndexNow([`/blog/${outcome.slug}`, '/blog']);

    return NextResponse.json({
      success: true,
      published: true,
      message: 'Content generated successfully',
      post: {
        id: outcome.id,
        slug: outcome.slug,
        type: contentRequest.type,
        topic: contentRequest.topic,
      },
      notes: outcome.reasons,
      downgraded: outcome.downgraded,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}