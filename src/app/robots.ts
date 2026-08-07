import { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Crawler policy.
 *
 * The AI crawlers are listed explicitly and allowed. They already fall under
 * the `*` rule, but naming them is a deliberate signal: several operators
 * treat an explicit allow as consent, and a few publishers block them by
 * default via CDN rules. For a portfolio the goal is the opposite of a
 * publisher's — being quoted by an assistant that someone asked "who can build
 * me an agentic AI system" is the entire point.
 *
 * /edit stays disallowed everywhere. It is behind auth, but there is no reason
 * for an admin surface to appear in any index.
 */
const AI_CRAWLERS = [
  "GPTBot",            // OpenAI — ChatGPT training
  "OAI-SearchBot",     // OpenAI — ChatGPT search results
  "ChatGPT-User",      // OpenAI — user-initiated browsing
  "ClaudeBot",         // Anthropic
  "Claude-User",       // Anthropic — user-initiated browsing
  "PerplexityBot",     // Perplexity
  "Perplexity-User",   // Perplexity — user-initiated
  "Google-Extended",   // Google — Gemini / AI Overviews grounding
  "Applebot-Extended", // Apple Intelligence
  "meta-externalagent",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/edit/", "/api/"],
      },
      ...AI_CRAWLERS.map(userAgent => ({
        userAgent,
        allow: "/",
        disallow: ["/edit/", "/api/"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
