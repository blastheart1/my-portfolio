import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/edit/",
    },
    sitemap: "https://luis.dev/sitemap.xml",
  };
}
