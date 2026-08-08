import { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { isDemoVisible } from "@/lib/content-queries";
import { WORK_PROJECTS } from "@/lib/work-projects";

/**
 * Sitemap.
 *
 * Section anchors are deliberately NOT listed — a fragment is not a separate
 * document and submitting them dilutes rather than helps. What is listed is
 * every genuinely distinct page.
 */
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
    {
      url: `${SITE_URL}/website-workflow`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
