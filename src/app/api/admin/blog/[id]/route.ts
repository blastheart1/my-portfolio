import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { deleteBlogPost } from '@/lib/database';
import { requireAdmin } from '@/lib/require-admin';

/**
 * DELETE /api/admin/blog/[id]
 *
 * There was no way to remove a blog post. Generation was the only write path,
 * and once a row existed nothing in the application could take it back — which
 * was tolerable when the posts had no URLs and merely filled a carousel.
 *
 * Now that each row is a page, "publish" needs an inverse:
 *   - tests/e2e/blog-revalidation.spec.ts creates a real post through the real
 *     API and would otherwise leave it in the live table on every run;
 *   - a post that should never have gone out needs removing without opening
 *     the Supabase console.
 *
 * Deletion rather than unpublishing is correct here: an unpublished row still
 * holds its slug in the unique index, so the URL stays permanently reserved by
 * something nobody can see. For a bulk sweep of existing content, use
 * scripts/quarantine-blog.ts, which unpublishes on purpose and prints the ids.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const deleted = await deleteBlogPost(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }

  // The home page renders the blog section and /blog lists the post, so both
  // go stale the moment a row disappears. The sitemap too, once blog URLs are
  // advertised. Nothing is submitted to IndexNow: there is no "forget this"
  // signal, and the URL now 404s, which is the message.
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ success: true });
}
