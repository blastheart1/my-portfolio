# Website Build Workflow — Rocket / F1 Philosophy
> **Theme**: Every delivery is a launch. Every pixel is a pit stop.
> Built from: The AI Surfer scroll-animation walkthrough + portfolio architecture lessons.

---

## Philosophy: The F1 Pit Crew Model

| F1 Concept | Web Equivalent |
|---|---|
| **Aerodynamic precision** | Performance-first code (60fps, LCP < 1s) |
| **Seamless pit stop** | Zero-friction UX, invisible transitions |
| **Telemetry data** | Lighthouse scores, Core Web Vitals |
| **Race strategy** | Content hierarchy & conversion funnel |
| **Livery / Identity** | Visual theme — cohesive, unmistakable |
| **Rocket ignition** | Hero scroll animation — the first impression |

The human provides **vision and strategy** (the race engineer).  
AI handles **execution complexity** (the car's onboard computer).

---

## Phase 0 — Discovery & Moodboard (15 min)

**Goal**: Lock the visual identity before touching code.

- [ ] Define the **hero metaphor** — what object/motion represents the brand?
  - Portfolio example: `rocket launch` or `F1 car at full throttle`
- [ ] Choose a **color palette** anchored to the metaphor
  - Rocket: deep space black `#050505`, afterburner orange `#FF4500`, exhaust white `#F5F5F5`
  - F1: carbon fiber `#1A1A1A`, racing red `#E8002D`, titanium `#C0C0C0`
- [ ] Collect 3–5 reference sites (Awwwards, Dribbble, competitors)
- [ ] Decide dark/light mode strategy (portfolio: dark primary)

**Output**: 1-paragraph creative brief + palette hex codes + metaphor keyword.

---

## Phase 1 — Hero Animation Asset Production (30 min)

The scroll-linked hero animation is the **rocket ignition moment** — everything else supports it.

### 1a. Generate Frame A (intact / launch-ready state)
Use **Google Whisk** or **Midjourney**.

Prompt template:
```
Ultra-premium [product/object] photography, [hero metaphor],
[material finish], [lighting style: dramatic side light / studio],
[color palette], isolated on pure [#BACKGROUND_HEX] background,
no shadows outside subject, 8K, commercial photography
```

Portfolio example:
```
Ultra-premium rocket on launch pad, brushed titanium and carbon fiber,
dramatic underlighting with orange afterburner glow, isolated on pure
#050505 background, no drop shadow, 8K commercial photography
```

### 1b. Generate Frame B (exploded / post-ignition state)
Same prompt + append:
```
...exploded view with all components separated and floating,
each piece visible, same lighting and background
```

### 1c. Animate Between Frames
- Upload both to **Google Veo** → "Frames to Video"
- Duration: 4–6 seconds, smooth interpolation
- Download MP4

### 1d. Extract Frames
- Upload MP4 to **EZGif** → Video to GIF → extract frames at 30fps
- ~180–240 frames = ~180–240 scroll steps
- Save to `public/frames/` (named `frame-001.webp` … `frame-240.webp`)

> **Rocket principle**: Pre-compress frames to WebP. Total asset bundle < 8MB.

---

## Phase 2 — Project Scaffold (10 min)

```bash
# For new projects
npx create-next-app@latest [project-name] \
  --typescript --tailwind --app --no-src-dir

# For existing (portfolio)
# Already on Next.js 14 App Router + Tailwind ✓
```

**Core dependencies:**
```bash
npm install framer-motion gsap @gsap/react
```

**Folder structure:**
```
public/
  frames/          ← animation frames (WebP)
src/
  components/
    HeroCanvas.tsx       ← scroll-linked canvas renderer
    ScrollProgress.tsx   ← scroll position provider
    HeroSection.tsx      ← full composition
  hooks/
    useScrollProgress.ts ← scroll % → frame index
```

---

## Phase 3 — Core Animation Build (Cursor AI Prompt)

Paste this into **Cursor Agent mode**:

```
Build a scroll-linked frame animation for Next.js 14 App Router.

REQUIREMENTS:
- Component: HeroCanvas.tsx
- Renders HTML5 Canvas, full viewport (100vw x 100vh)
- Loads frames from /frames/frame-[NNN].webp (001 to 240, zero-padded)
- Maps window scroll progress (0–100%) to frame index (0–239)
- Preloads all frames on mount using Image() objects, shows loading progress
- Uses requestAnimationFrame for 60fps rendering
- Canvas background: #050505 (matches page bg — edges invisible)
- On mobile: reduce to 120 frames (every other frame) for performance
- Wrap in a sticky container: position sticky, top 0, height 100vh
- Parent scroll container: height = 400vh (controls scroll duration)

TEXT OVERLAY:
- Heading: "[YOUR HEADLINE]" — white, 72px, font-weight 700
- Subtext: "[YOUR SUBTEXT]" — fades in at 30% scroll, fades out at 70%
- Parallax: heading moves up 40px over the scroll range

PERFORMANCE:
- Use IntersectionObserver — only animate when canvas is visible
- Decode images with img.decode() before storing
- Use offscreen canvas for pre-rendering if supported

OUTPUT: Single self-contained TSX component, no external state needed.
```

---

## Phase 4 — Section Architecture (the Race Circuit)

Each section is a **race sector** — distinct character, seamless transition.

| Section | F1 Analogy | Purpose |
|---|---|---|
| Hero + Scroll Anim | Start/Finish straight | First impression, max speed |
| About | Pit lane | Who you are, build trust |
| Skills/Stack | Telemetry display | Technical credibility |
| Projects | Race highlights reel | Proof of performance |
| Services | Sponsorship tiers | Commercial proposition |
| Contact / CTA | Podium | Conversion moment |

**Transition principle**: Each section exit = the next section enters from below with a 20px upward slide + opacity fade (Framer Motion `viewport` trigger).

```tsx
// Section wrapper pattern
<motion.section
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
```

---

## Phase 5 — Typography & Color System

### F1/Rocket Palette
```css
/* Base */
--bg:        #050505;
--surface:   #0F0F0F;
--border:    #1E1E1E;

/* Brand accent — choose ONE */
--accent:    #E8002D;   /* F1 red */
/* OR */
--accent:    #FF4500;   /* Rocket orange */

/* Text */
--text-1:   #F5F5F5;   /* headings */
--text-2:   #A0A0A0;   /* body */
--text-3:   #555555;   /* muted */
```

### Font Stack
```css
/* Speed & precision feel */
font-family: 'Inter', 'DM Sans', system-ui;

/* Optional display heading font */
font-family: 'Space Grotesk', 'Barlow Condensed';
```

---

## Phase 6 — Performance Gate (before deploy)

Run this checklist — **no deploy until all pass**:

```bash
npm run build          # zero errors, zero warnings
npx lighthouse [url]   # Performance ≥ 90
```

| Metric | Target | F1 analogy |
|---|---|---|
| LCP | < 1.2s | Reaction time off the line |
| CLS | < 0.1 | Smooth cornering, no wobble |
| FID / INP | < 100ms | Steering response |
| Bundle size | < 200kB JS | Weight reduction |
| Frame assets | < 8MB total | Fuel load optimization |

**Frame optimization command:**
```bash
# Convert all frames to WebP at 85% quality
for f in public/frames/*.jpg; do
  cwebp -q 85 "$f" -o "${f%.jpg}.webp"
done
```

---

## Phase 7 — Portfolio-Specific Application

For `codebyluis.dev`, the migration plan:

### Current state → Target state

| Element | Now (Headphone) | Target (Rocket/F1) |
|---|---|---|
| Hero object | Wireless headphones | Rocket or F1 car |
| Color | Dark + blue cursor | Dark + orange/red accent |
| Tagline | Generic | Speed + precision positioning |
| Scroll anim | None (GSAP splash) | Scroll-linked frame animation |
| About section | Text block | Story arc: "From zero to orbit" |
| Projects | Card grid | "Race results" — metric-driven |

### Suggested hero headline
```
"Full-Stack. Full Throttle."
```
or
```
"From Idea to Launch — At Race Pace."
```

### Projects card redesign
Each project card = a race result:
- **Lap time equivalent**: delivery speed ("shipped in 3 days")
- **Podium position**: impact metric ("40% faster load time")
- **Team**: stack badges as tire compound indicators

---

## Phase 8 — Commit & Ship Protocol

```bash
# Only after build passes and Lighthouse ≥ 90
git add src/components/HeroCanvas.tsx public/frames/
git commit -m "feat: rocket scroll animation hero with frame sequence"

# Verify build one final time
npm run build

git push origin main
```

> **Never push without a successful `npm run build`.** — Standing rule.

---

## Reusable Cursor AI Prompt Library

Save these for future projects:

### Scroll progress hook
```
Write a useScrollProgress React hook (TypeScript) that returns a number
0–1 representing how far the user has scrolled through a target element.
Use useRef + useEffect + scroll event listener. Throttle to rAF.
```

### Section entrance animation
```
Write a SectionReveal wrapper component (Framer Motion + TypeScript)
that slides children up 20px and fades in when they enter the viewport.
Props: children, delay (default 0), className.
```

### Canvas frame renderer
```
Write a CanvasFrameRenderer component that:
- Accepts: frames (HTMLImageElement[]), progress (0–1)
- Renders the correct frame to a canvas at 60fps via rAF
- Scales image to cover the canvas maintaining aspect ratio
- TypeScript, no external deps beyond React
```

---

## Template Checklist Summary

```
[ ] Phase 0: Creative brief + palette + metaphor locked
[ ] Phase 1: Frame A + B generated, animated, extracted (WebP)
[ ] Phase 2: Project scaffold, deps installed
[ ] Phase 3: HeroCanvas built via Cursor prompt
[ ] Phase 4: All sections scaffolded with entrance animations
[ ] Phase 5: Typography + color tokens applied globally
[ ] Phase 6: Lighthouse ≥ 90, bundle ≤ 200kB, frames ≤ 8MB
[ ] Phase 7: Portfolio content updated to F1/Rocket theme
[ ] Phase 8: Build passes → commit → push
```

---

*Template version: 1.0 — April 2026*
*Source: AI Surfer scroll-animation walkthrough + codebyluis.dev architecture*
