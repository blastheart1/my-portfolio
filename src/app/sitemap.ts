import { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Sitemap.
 *
 * Section anchors are deliberately NOT listed — a fragment is not a separate
 * document and submitting them dilutes rather than helps. What is listed is
 * every genuinely distinct page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/website-workflow`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
