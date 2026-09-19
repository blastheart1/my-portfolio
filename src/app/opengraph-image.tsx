import { ImageResponse } from "next/og";

import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";

/**
 * The site-level card, used wherever a route does not provide its own.
 *
 * The role line used to read "Full-Stack Developer · QA Specialist · AI
 * Engineer", which predates the repositioning and disagreed with the title,
 * the JSON-LD and llms.txt. This is a shared surface: it is what appears in
 * every link preview, which is often the first thing anyone sees.
 */

export const alt = "Antonio Luis Santos — AI Full-Stack Software Engineer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="~/portfolio $ whoami"
        title="Antonio Luis Santos"
        subtitle="AI Full-Stack Software Engineer"
        chips={["Next.js", "TypeScript", "Claude API", "IBM ODM"]}
      />
    ),
    size
  );
}
