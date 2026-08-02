import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, isRateLimited, RATE_LIMITS } from '@/lib/rate-limit';

// ─── Schema ───────────────────────────────────────────────────────────────────

const PromptConfigSchema = z.object({
  productName: z.string().min(1).max(100),
  metaphor: z.enum(['rocket', 'f1', 'custom']),
  customMetaphor: z.string().max(200).optional().default(''),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  customAccent: z.string().max(20).optional().default(''),
  headline: z.string().max(200),
  subtext: z.string().max(300),
  frameCount: z.number().int().min(60).max(480),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
});

type PromptConfig = z.infer<typeof PromptConfigSchema>;

// ─── Deterministic template (current iteration) ───────────────────────────────

function buildPrompt(config: PromptConfig): string {
  const metaphorLabel =
    config.metaphor === 'rocket'
      ? 'rocket launch sequence'
      : config.metaphor === 'f1'
      ? 'Formula 1 car at full throttle'
      : config.customMetaphor || 'product';

  return `ACT AS:
A world-class Creative Developer (Awwwards-level) specializing in Next.js, Framer Motion, and scroll-based animations.

THE TASK:
Build a high-end "Scrollytelling" landing page for "${config.productName}".
The hero metaphor is a ${metaphorLabel}.

The core mechanic is a scroll-linked animation that plays an image sequence
(${config.frameCount} frames) as the user scrolls down.

TECH STACK:
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Animation: Framer Motion
- Rendering: HTML5 Canvas (for performance)

VISUAL DIRECTION & COLOR:
- Seamless Blending: Background of the website MUST match the background
  color of the image sequence exactly (${config.bgColor}) so image edges
  are invisible.
- Color Palette: Pure Dark Mode. Page background: "${config.bgColor}".
  Accent color: "${config.accentColor}".
  Headings: text-white/90. Body: text-white/60.
- Typography: Inter or Space Grotesk. Clean, tracking-tight, minimalist.

INTERACTION:
- As the user scrolls, the image sequence scrubs forward/backward
  frame-by-frame, synced to scroll position.
- Smooth, buttery 60fps performance via requestAnimationFrame.
- On mobile: use every other frame (${Math.round(config.frameCount / 2)} frames) for performance.
- Preload all frames on mount using Image() objects, show a loading progress indicator.
- Add subtle parallax text overlays ("${config.headline}", "${config.subtext}")
  that fade in/out as the user scrolls (in at 30% scroll, out at 70%).

STRUCTURE:
- Hero section with scroll prompt ("Scroll to Explore")
- Sticky scroll container: height = 400vh (controls scroll duration)
- Scroll-linked animation section (the image sequence in a Canvas element)
- Footer section with CTA

COMPONENTS TO CREATE:
1. HeroCanvas.tsx — self-contained Canvas renderer, accepts progress (0–1)
2. useScrollProgress.ts — hook returning scroll progress through a target element
3. HeroSection.tsx — full composition with sticky wrapper and text overlays

PERFORMANCE:
- Use IntersectionObserver — only animate when canvas is visible
- Decode images with img.decode() before storing
- Canvas background: ${config.bgColor} (matches page bg)
- Scale image to cover canvas maintaining aspect ratio

Use best practices for performance, accessibility, and responsive design.
Frames are located at: /frames/frame-[NNN].webp (001 to ${String(config.frameCount).padStart(3, '0')}, zero-padded).`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { limit, windowMs } = RATE_LIMITS.generatePrompt;
  if (isRateLimited(`generate-prompt:${ip}`, limit, windowMs)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PromptConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 422 },
    );
  }

  // ── Current iteration: deterministic template ────────────────────────────
  const prompt = buildPrompt(parsed.data);

  // ── Next iteration: AI-enhanced prompt via OpenAI ────────────────────────
  // Uncomment when ready. Requires OPENAI_API_KEY in .env.local
  //
  // import OpenAI from 'openai';
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages: [
  //     {
  //       role: 'system',
  //       content:
  //         'You are a senior creative technologist. Given a base Cursor AI prompt and project configuration, ' +
  //         'enhance the prompt with specific, opinionated design details, animation timing curves, and ' +
  //         'micro-interaction ideas tailored to the brand metaphor. Keep it actionable and precise.',
  //     },
  //     {
  //       role: 'user',
  //       content: `Base prompt:\n${prompt}\n\nEnhance it for a ${parsed.data.metaphor} metaphor with accent ${parsed.data.accentColor}.`,
  //     },
  //   ],
  //   temperature: 0.7,
  //   max_tokens: 2000,
  // });
  //
  // const aiPrompt = completion.choices[0]?.message?.content ?? prompt;
  // return NextResponse.json({ success: true, data: { prompt: aiPrompt } });

  return NextResponse.json({ success: true, data: { prompt } });
}
