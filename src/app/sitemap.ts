import { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { isDemoVisible } from "@/lib/content-queries";
import { getPublishedBlogSlugs } from "@/lib/database";
import { BLOG_INDEXABLE } from "@/lib/blog/visibility";
import { getResearchDocs } from "@/lib/research";
import { WORK_PROJECTS } from "@/lib/work-projects";

/**
 * Sitemap.
 *
 * Section anchors are deliberately NOT listed — a fragment is not a separate
 * document and submitting them dilutes rather than helps. What is listed is
 * every genuinely distinct page.
 */

/**
 * Without this the sitemap is generated once, at build, because nothing in it
 * uses a dynamic API. Blog posts arrive from a cron every two days and are
 * pinged to IndexNow the moment they land, so a build-time sitemap would
 * advertise them only when somebody next happened to deploy — the submission
 * and the sitemap disagreeing about what exists. The write paths also call
 * revalidatePath('/sitemap.xml') directly; this is the floor beneath that.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // Only list case studies that are actually reachable. Submitting a URL that
  // 404s because its section is switched off wastes crawl budget and, once
  // indexed, keeps sending visitors to a dead page after it is hidden again.
  const work = await Promise.all(
    WORK_PROJECTS.map(async project => ({
      project,
      shown: await isDemoVisible(project.sectionId),
    }))
  );

  // Gated by the same constant as the routes' robots directive, so the sitemap
  // can never advertise URLs that carry noindex. getPublishedBlogSlugs
  // swallows its own errors — including the slug column not existing yet,
  // since that migration is applied by hand — and returns [], which degrades
  // to a sitemap without blog URLs rather than a failed build.
  const blog = BLOG_INDEXABLE ? await getPublishedBlogSlugs() : [];

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/work`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...work
      .filter(entry => entry.shown)
      .map(entry => ({
        url: `${SITE_URL}/work/${entry.project.slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ...(BLOG_INDEXABLE
      ? [
          {
            url: `${SITE_URL}/blog`,
            lastModified: blog[0]?.updatedAt ?? lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
    // Real timestamps, from the row. A sitemap that stamps every URL with the
    // build time claims everything changed on every deploy, and a freshness
    // signal that is wrong that often stops being read.
    ...blog.map(entry => ({
      url: `${SITE_URL}/blog/${entry.slug}`,
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Research documents are files in the repo, so this cannot fail and needs
    // no visibility gate. They are indexable regardless of BLOG_INDEXABLE:
    // each is hand-written and reviewed, which is the bar that flag exists to
    // enforce for generated posts.
    ...getResearchDocs().map(doc => ({
      url: `${SITE_URL}/research/${doc.slug}`,
      lastModified: doc.date ? new Date(doc.date) : lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/website-workflow`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
