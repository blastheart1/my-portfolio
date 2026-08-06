# Sticky Scrollytelling Portfolio — Content Transplant Prompt

**Subject:** Take an HTML template that already contains a working *sticky-container scrollytelling hero* and transplant `codebyluis.dev` portfolio content into it — **without weakening, flattening, or re-implementing the sticky mechanic.**

**Reference template in this repo:** `prompts/velocity-template.html`
**Reference production implementation:** `public/mobile.html` (6-frame sticky sequence + canvas frame sequencer + bento sticky)
**Repo scroll primitive to reuse in React contexts:** `src/contexts/ScrollContext.tsx`

This is a **content transplant** prompt, not a redesign prompt. The single most common failure is an assistant "improving" the layout and silently deleting the sticky container. Everything below exists to prevent that.

---

## 1. Purpose — when to use this

Use this prompt when **all** of the following are true:

| Condition | Why it matters |
|---|---|
| You already have a template with a tall scroll container + `position: sticky` viewport | This prompt preserves a mechanic; it does not build one |
| The template's scroll phases are generic/placeholder | The job is filling them with real narrative |
| You want the design language kept 1:1 | Dark cinematic, orange accent, HUD overlays, glass panels |
| The output is a single self-contained HTML file or a small set of components | Larger refactors need a plan, not a prompt |

### When NOT to use this

- **Building a scrollytelling hero from scratch** → use the generator at `src/app/api/website-workflow/generate-prompt/route.ts` (`/website-workflow`), which emits a Next.js + canvas frame-sequence prompt.
- **Adding scroll animation to the React app under `src/`** → do not hand-roll a listener; subscribe to `ScrollContext` (`useScrollY()`), which is already a single rAF-throttled passive listener. See §7.
- **Redesigning visual language** (new palette, new type scale, new layout) → out of scope; this prompt forbids it.
- **Content is short** (one screen of copy) → a sticky container with 5 phases will feel padded. Use a normal hero.
- **Target audience is primarily assistive-tech or low-power mobile** → ship the reduced-motion static variant as the *primary* experience instead.

---

## 2. Required context to supply

Fill these in before invoking. Defaults are the current `codebyluis.dev` values.

| Variable | Meaning | Example / default |
|---|---|---|
| `TEMPLATE_PATH` | The HTML file being transformed | `prompts/velocity-template.html` |
| `NAME` | Full name | `Antonio Luis Santos` |
| `BRAND` | Wordmark used in HUD/footer | `CODE BY LUIS` |
| `ROLE` | Headline role | `AI Full Stack Software Engineer` |
| `SUMMARY` | 1–2 sentences, ≤ 320 chars | See §2.1 |
| `SOURCE_METAPHOR` | Metaphor being replaced | `Formula 1 / motorsport` |
| `TARGET_METAPHOR` | Metaphor replacing it | `AI systems engineering` |
| `ACCENT` | Accent hex — must match template | `#ff5625` (`primary-container`) |
| `BG` | Page background hex — must match template and any frame assets | `#050505` |
| `HEADLINE_FONT` / `BODY_FONT` | Must match template | `Space Grotesk` / `Inter` |
| `PHASE_COUNT` | Number of scroll phases in the sticky container | `5` (template) / `6` (`mobile.html`) |
| `SCROLL_HEIGHT` | Total height of the tall scroll container | `5000px` in template; prefer `calc(100vh + PHASE_COUNT * 80vh)` |
| `TECH_STACK` | Stack shown in telemetry HUD | See §2.1 |
| `EXPERIENCE` | Roles + employers + dates | See §2.1 |
| `PROJECTS` | Project names for the manifest section | See §2.1 |
| `CTA_PRIMARY` / `CTA_SECONDARY` | Final-phase calls to action | `Let's build intelligent systems` / `Get in touch` |
| `LOCATION` | Footer/contact locale | `Manila, Philippines` |
| `FRAME_ASSETS` | Path + count of any canvas frame sequence | `/frames/frame-NNN.webp`, 180 |

### 2.1 Default content source

```
NAME       Antonio Luis Santos
BRAND      CODE BY LUIS
ROLE       AI Full Stack Software Engineer

SUMMARY
I build AI agents and apps that automate workflows, integrate with OpenClaw,
and follow industry-standard security. Full stack engineer delivering
production-ready systems using React, Next.js, Python, and FastAPI.

TECH_STACK
  Frontend   React · Next.js · TypeScript · TailwindCSS
  Backend    Python · FastAPI · Node · PostgreSQL · Supabase
  AI/DevOps  OpenAI · OpenClaw · Zapier · TensorFlow · Docker · AWS · Vercel

EXPERIENCE
  AI Full Stack Software Engineer — Bruntwork                 2024 — Present
  Senior IBM ODM Specialist & QA Manager — Bell Canada        2023 — 2024
  Senior IBM ODM Developer — Bell Canada                      2020 — 2023
  ODM Developer — Bell Canada                                 2019 — 2020

PROJECTS
  Advanced Chatbot · Resume Analyzer · Voice Assistant ·
  SmartSync Integrator · VA Portfolio

CTA        Let's build intelligent systems / Get in touch
LOCATION   Manila, Philippines
```

---

## 3. The prompt

> Copy from here to the end of §3. Substitute `{{VARIABLES}}` from §2.

```
You are a senior frontend engineer and creative UI architect.

I am giving you an HTML portfolio template ({{TEMPLATE_PATH}}) that already
contains a WORKING sticky-container scrollytelling hero. Your job is to
transplant MY content into it while FULLY PRESERVING and FULLY UTILIZING the
sticky container experience.

This is a CONTENT TRANSPLANT, not a redesign. If you find yourself rewriting
layout structure, stop — you have misread the task.

────────────────────────────────────────────────────────────────
A. WHAT MUST SURVIVE UNCHANGED
────────────────────────────────────────────────────────────────
Structural (do not delete, do not restructure):
  - The tall scroll container (the element with explicit scroll height)
  - The `sticky top-0 h-screen` viewport inside it
  - Layered absolute overlays inside the sticky viewport
  - Telemetry HUD panels (left/right rails, corner readouts, load bar)
  - Frame progress indicators (dots / rail)
  - Glass panels (`.glass-panel`), telemetry grid background
  - Bottom floating nav
  - Performance / stat cards
  - The scroll→progress JavaScript and its frame windows

Design language (do not alter):
  - Dark cinematic theme; page background {{BG}}
  - Accent {{ACCENT}} used exactly where the template already uses it
  - Typography: {{HEADLINE_FONT}} for headlines, {{BODY_FONT}} for body
  - Existing tracking, uppercase treatments, and letter-spacing scales
  - Existing spacing rhythm and Tailwind class vocabulary
  - Existing scrollytelling pacing (phase boundaries and crossfade widths)

Change ONLY: text nodes, list items, icon names, and small content blocks.
Reuse existing classes. Do not introduce a new class vocabulary.

────────────────────────────────────────────────────────────────
B. TECH STACK — FIXED, NO ADDITIONS
────────────────────────────────────────────────────────────────
  - Single HTML file, same as the template
  - Tailwind via the CDN <script> already present
  - Vanilla ES5-compatible JavaScript in the existing IIFE
  - Google Fonts: {{HEADLINE_FONT}}, {{BODY_FONT}}, Material Symbols Outlined
  - NO new libraries. No GSAP, no ScrollMagic, no Locomotive, no Lenis,
    no Framer Motion, no jQuery, no Swiper, no AOS.
  - No build step, no bundler, no module imports.

────────────────────────────────────────────────────────────────
C. THE SCROLL MECHANIC — EXACT SPECIFICATION
────────────────────────────────────────────────────────────────
Structure:
  <section id="hero" style="height: {{SCROLL_HEIGHT}}">     ← tall container
    <div class="sticky top-0 h-screen overflow-hidden">      ← pinned viewport
      <div class="absolute inset-0" data-phase="1"> … </div> ← stacked frames
      …
    </div>
  </section>

Progress mapping (this is the contract — do not change the formula):
  sectionTop  = section.offsetTop
  travelable  = section.offsetHeight - window.innerHeight
  progress    = clamp01((window.scrollY - sectionTop) / travelable)

  - `progress` is 0 at the moment the section pins and 1 at the moment it
    unpins. Never derive progress from a hard-coded pixel constant.
  - `travelable` must be recomputed on resize; cache it, do not read
    `offsetTop`/`offsetHeight` inside the scroll callback on every frame.

Phase windows for {{PHASE_COUNT}} = 5 (keep these numbers):
  | Phase | Content            | Fade in    | Hold        | Fade out    |
  |-------|--------------------|------------|-------------|-------------|
  | 1     | Hero identity      | —          | 0.00–0.30   | 0.30–0.40   |
  | 2     | What I build       | 0.25–0.35  | 0.35–0.60   | 0.60–0.70   |
  | 3     | Tech telemetry     | 0.65–0.75  | 0.75–1.00   | —           |
  | 4     | Experience         | (post-pin section, see below)          |
  | 5     | CTA / launch       | (own sticky container, see below)      |

  - Fade windows overlap by 0.05–0.10 so phases crossfade rather than blink.
  - The final phase must HOLD for at least 20% of the container's travel
    ("dwell") so it is readable before unpin.
  - Phase 4 and 5 live in their own sections that follow the same formula —
    the CTA section runs tape-unravel over 0.00–0.50 and CTA fade-in over
    0.45–0.70, with 30% dwell.

Easing:
  - Opacity/translate transitions in CSS: cubic-bezier(0.16, 1, 0.3, 1)
    (expo-out) at 650ms, matching the existing frames.
  - Scroll-driven values computed in JS: ease-out cubic
    `eased = 1 - Math.pow(1 - t, 3)`.
  - Never apply a CSS `transition` to a property that JS is also writing
    every rAF tick — that double-smooths and causes visible lag.

Pinning behavior:
  - `position: sticky; top: 0` only. Never `position: fixed` with manual
    top offsets, and never `transform: translateY()` fake-pinning.
  - The sticky element's height is exactly one viewport:
    `height: 100dvh` with `height: calc(var(--vh, 1vh) * 100)` as fallback
    for browsers without dvh (set `--vh` on resize, as mobile.html does).
  - `overflow-x: hidden` on body; NEVER `overflow: hidden` on <html> or a
    scroll-locking wrapper.

Exit conditions:
  - When `progress` reaches 1 the section unpins naturally. No JS unpinning.
  - When the section is fully out of view, stop all per-frame work for it
    (see IntersectionObserver in §D).

Reveal-on-scroll for non-pinned content (experience timeline, project cards):
  - Use IntersectionObserver at `threshold: 0.15` with a staggered
    `120ms * index` delay, then `unobserve` — one-shot, not repeating.
  - Do NOT compute these with scroll math.

────────────────────────────────────────────────────────────────
D. PERFORMANCE — HARD REQUIREMENTS
────────────────────────────────────────────────────────────────
Listeners:
  - EXACTLY ONE `scroll` listener for the whole page, registered
    `{ passive: true }`, throttled with requestAnimationFrame:

      var ticking = false;
      function onScrollRaw() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { onScroll(); ticking = false; });
      }
      window.addEventListener('scroll', onScrollRaw, { passive: true });

  - `resize` listener also `{ passive: true }`, and it recomputes cached
    geometry (offsetTop, offsetHeight, innerHeight) — nothing else.
  - No `wheel`, `touchmove`, or `scroll` listener that calls
    `preventDefault()`. Ever.

Layout thrash:
  - Read all geometry ONCE at the top of the rAF callback, then write.
    Never interleave read → write → read within one frame.
  - Cache `offsetTop`/`offsetHeight`/`innerHeight` outside the callback;
    refresh only on resize and on IntersectionObserver entry.

Compositing:
  - Animate ONLY `opacity` and `transform`. Never animate `top`, `left`,
    `width`, `height`, `margin`, `filter`, or `box-shadow` on scroll.
  - `will-change: transform, opacity` on animated layers only — cap at
    ~12 elements total on the page. Remove it from elements that are done
    animating. Never put `will-change` on a container of 100+ children.
  - Elements that JS writes transforms to must not also carry a Tailwind
    `transition-transform` class.

Asset budget:
  - Frame sequences: WebP or AVIF only. PNG frame sequences are forbidden.
    Target ≤ 40 KB per frame, ≤ 3.0 MB total on desktop.
  - Mobile (≤ 768px or `navigator.connection.saveData`): load every other
    frame — half the count, ≤ 1.2 MB total.
  - Total page transfer excluding frames: ≤ 500 KB.
  - Inline JS for the whole page: ≤ 15 KB unminified.
  - Fonts: ≤ 3 families, `display=swap`, subset to `latin`, preconnect to
    `fonts.gstatic.com`.

Preloading:
  - Never fire N `new Image()` requests in a single synchronous loop.
    Preload in a bounded queue of at most 6 concurrent requests.
  - Await `img.decode()` before storing an image, so the first paint of a
    frame never blocks on decode inside a rAF tick.
  - Load frame 0 eagerly and paint it immediately; stream the rest.
  - Show the existing load bar as real progress (loaded/total), not a fake
    timed animation.

Idle work:
  - Wrap the whole per-section update in an IntersectionObserver gate:
    if the section is not intersecting, return early from its branch.
  - Canvas frame sequencer: only `drawImage` when the target frame index
    actually changed; skip the draw when `smoothIdx` rounds to the frame
    already painted.
  - Canvas backing store: `canvas.width = innerWidth * min(devicePixelRatio, 2)`.
    Do not exceed DPR 2 — 3x costs ~2.25x the fill rate for no visible gain.

Mobile degradation (required, not optional):
  - ≤ 768px: halve the frame sequence, disable the starfield parallax loop
    (or cap stars at 60), and disable backdrop-filter on more than 2
    simultaneously visible glass panels.
  - Respect `env(safe-area-inset-*)` on all fixed/sticky chrome.
  - Do not attach the scroll handler at all if the section never mounts.

────────────────────────────────────────────────────────────────
E. ACCESSIBILITY — HARD REQUIREMENTS
────────────────────────────────────────────────────────────────
prefers-reduced-motion (MANDATORY):
  - Query it in JS once: `matchMedia('(prefers-reduced-motion: reduce)')`
    and also honor it in CSS.
  - Fallback behavior is SPECIFIED, not "turn animations off":
      * The sticky container collapses to `height: auto` and the phases
        render as a normal vertical stack, each `min-height: auto`,
        all at `opacity: 1; transform: none`.
      * The canvas frame sequence renders ONE representative still frame
        (frame index ≈ 0.65 * total) and no further frames are fetched.
      * The scroll handler still runs for the load bar only; all
        transform/opacity writes are skipped.
      * Every piece of content that was reachable by scrubbing is still
        present in the DOM and readable.
  - Listen for changes to the media query and apply without reload.

Keyboard:
  - Tab, Space, PageDown, Arrow keys, Home and End must all scroll the page
    normally. Do not intercept them to "snap" to phases.
  - Optional enhancement: Arrow Up/Down may `scrollTo` the next phase's
    progress offset with `behavior: 'smooth'` ONLY when focus is inside the
    hero and ONLY as an addition — never as a replacement for native scroll.
  - Every link/button reachable in the sticky container must have a visible
    focus ring meeting 3:1 contrast against {{BG}}.

Focus order in pinned sections:
  - Phases that are visually hidden (`opacity: 0`) MUST also be
    `pointer-events: none` AND removed from the tab order via
    `inert` (or `visibility: hidden` on the wrapper). A user must never
    tab into invisible content.
  - When a phase becomes active, restore it to the tab order. Do not
    programmatically steal focus on scroll.

Screen readers:
  - Scroll-driven decorative layers (canvas, starfield, HUD grid, scanlines,
    tape) get `aria-hidden="true"`.
  - The narrative content itself must be in semantic order in the DOM —
    the reading order without CSS must tell the same story as scrubbing.
  - Provide ONE `<h1>` (the identity headline) and `<h2>` per phase.
  - The load bar is `role="progressbar"` with `aria-valuenow`, or
    `aria-hidden="true"` if purely decorative.
  - Do not use `aria-live` for scroll-driven changes — it will spam.

Never trap scroll:
  - No `overflow: hidden` on `html`/`body` while the hero is active.
  - No scroll-snap that prevents reaching content.
  - No `preventDefault()` on wheel/touch.
  - A user must be able to get from the top to the footer with one long
    flick, and with `End`.

Contrast:
  - Body copy ≥ 4.5:1 against its actual painted backdrop (including over
    the canvas — add a scrim, do not lower text opacity below 0.75).
  - Accent {{ACCENT}} on {{BG}} is used for large/bold text and borders;
    do not use it for small body copy.

────────────────────────────────────────────────────────────────
F. CONTENT — PHASE-BY-PHASE
────────────────────────────────────────────────────────────────
Translate the {{SOURCE_METAPHOR}} vocabulary into {{TARGET_METAPHOR}}.
Keep the same word count and typographic weight per slot so the layout
does not reflow.

  Phase 1 — Identity
    Eyebrow:   ENGINEER PROFILE
    Headline:  {{BRAND}}
    Sub:       {{ROLE}}
    Body:      {{SUMMARY}}
    Overlay:   "AI Systems at Full Velocity"

  Phase 2 — What I build
    AI agents · Automation pipelines · Integrations ·
    Full stack architecture · Secure, production-ready delivery

  Phase 3 — Tech telemetry (HUD style, three columns)
    Frontend / Backend / AI & DevOps — from {{TECH_STACK}}

  Phase 4 — Experience & credibility
    {{EXPERIENCE}} rendered on the existing timeline, newest first,
    with the existing hover popup for detail.

  Phase 5 — CTA
    Status line: "Status: Ready for Launch"
    Headline:    "{{CTA_PRIMARY}}"
    Button:      "{{CTA_SECONDARY}}"
    Footer:      {{LOCATION}}

Metaphor translation table (apply consistently):
  Pinnacle Engineering            → AI Systems at Full Velocity
  Engineered for extreme speed    → Production-ready AI systems
  Pure technical superiority      → Intelligent architecture
  View Blueprints                 → View Projects
  Let's Build The Future          → Let's Build Intelligent Systems
  Race Log                        → Delivery Log
  Driver Profile                  → Engineer Profile
  Pit Wall / Telemetry            → Stack Telemetry (keep the HUD framing)

Copy rules:
  - No invented metrics, no fake client logos, no fabricated testimonials,
    no made-up years of experience. Only what is in {{EXPERIENCE}}.
  - No em-dash-heavy AI voice. Short declarative sentences.
  - Headlines ≤ 6 words. Body blocks ≤ 40 words.

────────────────────────────────────────────────────────────────
G. RESPONSIVE
────────────────────────────────────────────────────────────────
  - Fluid first: `clamp()` for headline sizes, e.g.
    `font-size: clamp(2.5rem, 9vw, 7rem)`. Do not build a ladder of
    fixed px sizes per breakpoint.
  - Breakpoints only where layout genuinely changes column count. Use the
    template's existing Tailwind breakpoints (sm 640 / md 768 / lg 1024 /
    xl 1280); do not introduce new custom pixel breakpoints.
  - Use `dvh` (with the `--vh` fallback) for the sticky viewport so mobile
    URL-bar collapse does not jump the pin.
  - Touch targets ≥ 44×44 px.
  - Side HUD rails hide below `md`; their information moves into the
    top/bottom HUD strips rather than being deleted.
  - Nothing may cause horizontal overflow at 320px width.

────────────────────────────────────────────────────────────────
H. OUTPUT
────────────────────────────────────────────────────────────────
  - Return the COMPLETE updated HTML file, top to bottom. No ellipses,
    no "…rest unchanged", no diff fragments.
  - Keep the existing file's formatting conventions and comment banners.
  - At the end, list every change you made as a short bullet list, grouped
    into: content, accessibility, performance. If you changed anything
    structural, justify it explicitly.
```

---

## 4. Positive guard rails

Each item is checkable by inspecting the produced file.

**Structure preserved**
- [ ] The tall scroll container still exists with an explicit height ≥ `100vh + PHASE_COUNT * 60vh`.
- [ ] `position: sticky; top: 0` viewport present and exactly one viewport tall.
- [ ] All phase layers still stacked with `absolute inset-0` inside the sticky viewport.
- [ ] HUD rails, load bar, frame dots, glass panels, bottom nav, performance cards all still present.
- [ ] Progress is still derived from `(scrollY - sectionTop) / (sectionHeight - innerHeight)`, clamped 0–1.

**Design language preserved**
- [ ] Background is `{{BG}}`; accent is `{{ACCENT}}`; no third accent introduced.
- [ ] Font families unchanged; no new `font-family` declarations.
- [ ] Tailwind class vocabulary reused — no new custom CSS classes beyond those already defined.
- [ ] Phase boundary percentages match §3.C exactly.

**Content**
- [ ] Every phase carries real portfolio content; zero lorem/placeholder strings remain.
- [ ] Every metaphor term from the translation table has been replaced everywhere (case-insensitive grep returns nothing).
- [ ] All names, roles, dates, and projects match §2.1 verbatim — nothing invented.

**Performance**
- [ ] Exactly one `scroll` listener, `{ passive: true }`, rAF-throttled.
- [ ] No geometry reads inside the per-frame write path.
- [ ] Only `opacity` and `transform` animate on scroll.
- [ ] `will-change` present on animated layers only, ≤ 12 elements.
- [ ] Frame assets are WebP/AVIF, preloaded with bounded concurrency ≤ 6, `decode()`-awaited.
- [ ] IntersectionObserver gates per-section work.
- [ ] Mobile path halves the frame sequence.

**Accessibility**
- [ ] `prefers-reduced-motion: reduce` collapses the sticky container to a readable static stack (§3.E), verified by toggling the OS setting.
- [ ] Hidden phases are `inert` / not tabbable; visible phases are.
- [ ] Native keyboard scrolling (Space, PageDown, End, arrows) works unmodified.
- [ ] Decorative layers are `aria-hidden="true"`.
- [ ] One `<h1>`, `<h2>` per phase, DOM order matches narrative order.
- [ ] Body copy ≥ 4.5:1 contrast over its painted backdrop.

---

## 5. Negative guard rails

| MUST NOT | Why |
|---|---|
| Remove or shorten the tall scroll container | It *is* the mechanic; a short container makes phases flash past in 200px of scroll |
| Convert the sticky hero into a static hero or a carousel | Loses the entire deliverable; this is the #1 observed failure |
| Fake the pin with `position: fixed` + JS `top`, or `transform: translateY(scrollY)` | Both fight the compositor, break on resize, and desync on iOS momentum scroll |
| Scroll-jack: `preventDefault()` on wheel/touch, custom scroll interpolation, forced snap between phases | Breaks find-in-page, keyboard scroll, assistive tech, and trackpad momentum; it is the fastest way to make a site unusable |
| Add any library (GSAP, Lenis, Locomotive, ScrollMagic, Framer Motion, AOS, jQuery) | The mechanic is ~80 lines of vanilla JS; a library adds 30–120 KB and a second scroll loop competing with the first |
| Register more than one `scroll` listener, or any non-passive one | Non-passive listeners force the browser to wait for JS before scrolling — instant jank on touch |
| Do work directly in the scroll event without rAF throttling | Scroll fires far more often than the compositor paints; unthrottled handlers produce 3–5x redundant layout work |
| Read `offsetTop`/`getBoundingClientRect()` inside the per-frame write path | Forces synchronous layout after every style write — classic layout thrash, shows up as long tasks |
| Animate `top`, `left`, `width`, `height`, `margin`, `filter`, or `box-shadow` on scroll | These trigger layout or paint every frame instead of compositor-only work |
| Blanket `will-change: transform` on containers or many children | Each promoted layer costs GPU memory; over-promotion is a known cause of mobile crashes and *slower* scrolling |
| Fire all N frame requests in one synchronous loop | 180 parallel requests saturate the connection, delay LCP, and can stall the main thread on decode |
| Ship PNG frame sequences | The current `/frames/ezgif-frame-NNN.png` set is exactly this problem; WebP is typically 60–80% smaller at equal quality |
| Preload the full-resolution sequence on mobile | Burns a metered connection for frames a 390px viewport cannot resolve |
| Skip `prefers-reduced-motion`, or implement it as "animations off" while leaving content unreachable | Vestibular-disorder users get motion sickness; a broken fallback also *hides content* |
| Leave `opacity: 0` phases in the tab order | Sighted keyboard users tab into a void and lose their place |
| Steal focus or auto-scroll on load / on phase change | Hijacks the user's reading position; hostile with a screen reader |
| Use `aria-live` for scroll-driven text changes | Announces on every phase transition — unusable noise |
| Set `overflow: hidden` on `html`/`body` while the hero is active | Traps scroll; user cannot reach the footer |
| Introduce new fixed pixel breakpoints where `clamp()`/fluid units work | Produces dead zones between breakpoints and more CSS to maintain |
| Insert elements without reserved dimensions above the fold (frames, canvas, images without width/height) | Causes CLS; the hero is the LCP region and is the most expensive place to shift |
| Redesign layout, change palette, change type scale, "modernize" the HUD | Explicitly out of scope; the design language is the client's brief |
| Invent metrics, clients, testimonials, or years of experience | Portfolio is a factual document; fabrication is a credibility and integrity failure |
| Return a partial file, a diff, or "rest unchanged" | The file must be usable as-is; partial output guarantees a broken merge |

---

## 6. Acceptance criteria & verification

### 6.1 Functional

| Check | How | Pass |
|---|---|---|
| Pin holds | Scroll slowly through the hero | Viewport content stays fixed for the full container height, no jump at pin/unpin |
| Phase pacing | Scroll at normal speed | Each phase is legible for ≥ 1.5s at typical scroll velocity; no blink-through |
| Crossfade | Watch phase boundaries | Overlapping fade, never a blank frame between phases |
| Exit | Scroll past the hero | Unpins cleanly; no residual `fixed` element |
| Resize | Resize window mid-pin, rotate device | Progress recomputes; no stuck or duplicated phase |
| Reverse scroll | Scroll up through the hero | Phases play backwards symmetrically |
| Deep link / refresh mid-hero | Reload while pinned | Correct phase renders on first paint (call `onScroll()` once at init) |

### 6.2 Metrics

Measure with Chrome DevTools → Performance + Lighthouse, on **Mobile / Slow 4G / 4x CPU throttle**.

| Metric | Budget | How to measure |
|---|---|---|
| CLS | **< 0.1** (target 0.0 for the hero) | Lighthouse; DevTools Performance → Layout Shift markers |
| LCP | **< 2.5 s** | Lighthouse. The hero headline or frame 0 should be LCP |
| INP | **< 200 ms** | DevTools → Performance → Interactions, while scrolling and clicking nav |
| Long tasks | **none > 50 ms** during scroll | Performance panel → Main thread, red-flagged tasks |
| Dropped frames | **< 5%** over a 10 s scroll | Performance panel → Frames track; look for red bars |
| Scripting per frame | **< 4 ms** | Performance → bottom-up, filter to the scroll callback |
| Page transfer (excl. frames) | **≤ 500 KB** | Network panel, disable cache |
| Frame sequence transfer | **≤ 3.0 MB** desktop / **≤ 1.2 MB** mobile | Network panel filtered to `/frames/` |
| Promoted layers | **≤ 12** | DevTools → Rendering → Layer borders / Layers panel |

### 6.3 Accessibility verification

```
1. macOS: System Settings → Accessibility → Display → Reduce motion → ON.
   Reload. The hero must render as a readable static stack with ALL
   content present. No frames fetched beyond one still.
2. Tab from the top of the page to the footer. Focus must never land on
   an invisible element. Focus ring visible at every stop.
3. Press End. The footer must be reached.
4. Press Space / PageDown repeatedly through the hero. Normal scrolling.
5. VoiceOver (Cmd+F5): rotor → headings. One h1, one h2 per phase,
   in narrative order. No live-region spam while scrolling.
6. Lighthouse Accessibility ≥ 95.
7. Zoom to 200% and to 320px width — no horizontal scrollbar.
```

### 6.4 Content verification

```bash
# No source-metaphor vocabulary left behind
grep -inE "pinnacle|driver|race log|pit|lap|throttle|blueprint|chassis|aero" \
  prompts/velocity-template.html

# No placeholders
grep -inE "lorem|ipsum|placeholder|your name|TODO|FIXME|xxx" \
  prompts/velocity-template.html

# Exactly one h1
grep -c "<h1" prompts/velocity-template.html

# Single scroll listener, passive
grep -n "addEventListener('scroll'" prompts/velocity-template.html
```

---

## 7. Repo-specific notes

**If the work lands in `src/` (the Next.js app) rather than a standalone HTML file:**

- Do **not** add a `window.addEventListener('scroll', …)`. Subscribe to the existing provider:

  ```tsx
  const { subscribe } = useScrollY();          // src/contexts/ScrollContext.tsx
  useEffect(() => subscribe((scrollY) => { /* write transforms directly */ }), [subscribe]);
  ```

  `ScrollProvider` is already a single rAF-throttled passive listener that fans out to all subscribers — adding another listener doubles the per-scroll work for no benefit.

- Follow `ParallaxBackground.tsx`: write `element.style.transform` via refs. Do **not** put scroll position in React state — that re-renders the tree on every frame.

- `useScrollFade.ts` (`src/hooks/useScrollFade.ts`) is the *older* pattern: it registers its own listener and calls `setState` per scroll event. Do not copy it for new work; prefer the `ScrollContext` + `ScrollFadeEffect.tsx` pattern.

- Tokens live in `src/app/globals.css` (oklch CSS custom properties, `.dark` class strategy) and `tailwind.config.js` (`darkMode: "class"`, `font-sf-pro`, breakpoints xs 475 → 2xl 1536, `min-h-44`/`min-w-44` touch targets). The standalone template uses its own inline Tailwind config with `#ff5625` / `#050505` — **the two systems are separate; do not cross-import tokens.**

- `public/mobile.html` is the reference implementation for: `--vh` fallback, `.sticky-viewport`, canvas frame sequencer with lerp smoothing (`F1_SCROLL_END = 0.40`, then hold), scroll-driven bento stagger, and the `prefers-reduced-motion` block at the end of its `<style>`. Reuse those patterns rather than reinventing them.

- **Known debt to fix, not replicate:** `mobile.html` preloads 180 **PNG** frames in a single synchronous loop with no concurrency cap and no `decode()`. Any new work must use WebP + a bounded queue (§3.D).

---

## 8. Common failure modes

| Failure | Symptom | Corrective instruction |
|---|---|---|
| Sticky silently deleted | Hero renders as one static screen; page is much shorter | "You removed the tall scroll container. Restore `<section id="hero">` with its explicit height and the `sticky top-0 h-screen` child, then re-attach the phase layers." |
| Phases flash past | Each phase visible for <0.5s | Container is too short. Set height to `calc(100vh + PHASE_COUNT * 80vh)` and re-derive the phase windows as fractions of total travel. |
| Pin jumps on mobile | Content lurches when the URL bar collapses | Replace `100vh` with `100dvh` plus the `--vh` custom-property fallback; recompute `--vh` on resize. |
| Janky scrub | Visible stutter, dropped frames | Unthrottled listener or layout thrash. Add the rAF gate; hoist all geometry reads out of the write path. |
| Double-smoothing lag | Animation trails the scroll by ~200ms | A CSS `transition` is applied to a property JS writes every frame. Remove the transition, or stop writing that property in JS — pick one. |
| Blank gap between phases | Momentary empty viewport at a boundary | Fade windows do not overlap. Make each phase's fade-in start ≥ 0.05 before the previous phase's fade-out ends. |
| Layout shift on load | CLS > 0.1, hero content hops | Canvas/img has no reserved box. Give the canvas explicit CSS width/height (100% / 100dvh) and set intrinsic `width`/`height` attributes on images. |
| Frames never finish loading | Load bar stalls; blank canvas | Unbounded parallel requests saturating the connection. Bound concurrency to 6 and paint frame 0 eagerly. |
| Tab into nothing | Keyboard focus disappears | Hidden phases still tabbable. Add `inert` (or `visibility: hidden`) alongside `opacity: 0`. |
| Reduced-motion hides content | Motion off → half the portfolio is invisible | The fallback must *collapse to a static stack*, not just disable transitions. `height: auto; opacity: 1; transform: none; position: static` on all phases. |
| Progress > 1 or NaN | Phases stick at 100% or vanish | `travelable` is 0 or negative (container shorter than viewport). Guard: `travelable = Math.max(1, sectionHeight - viewportH)`. |
| Scroll feels "sticky"/heavy | Trackpad momentum dies early | A library or custom smooth-scroll was added. Remove it — native scroll only. |
| Metaphor half-replaced | "Pit Wall" still in the HUD | Run the grep in §6.4 and replace every hit, including `title`, `alt`, `aria-label`, and comments. |
| Design drift | New rounded corners, new gradient, new blue | Revert to the template's class vocabulary. Only text nodes and list items were in scope. |

---

## 9. Worked example

**Invocation**

> Use `prompts/sticky-portoflio.md` §3 with:
> `TEMPLATE_PATH=prompts/velocity-template.html`, `BRAND=CODE BY LUIS`,
> `ROLE=AI Full Stack Software Engineer`, `SOURCE_METAPHOR=Formula 1`,
> `TARGET_METAPHOR=AI systems engineering`, `ACCENT=#ff5625`, `BG=#050505`,
> `PHASE_COUNT=5`, `SCROLL_HEIGHT=5000px`, `FRAME_ASSETS=/frames/frame-NNN.webp × 180`,
> and the §2.1 content block.

**Excerpt of a conforming result**

```html
<!-- Phase 1 — identity. Layer only; opacity driven by JS. -->
<section id="hero" class="h-[5000px] relative telemetry-grid">
  <div class="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">

    <canvas id="seqCanvas" class="absolute inset-0 w-full h-full" aria-hidden="true"></canvas>

    <div id="frame1" class="absolute inset-0 flex flex-col items-center justify-center px-6"
         style="opacity:1; will-change:opacity, transform">
      <p class="font-headline text-orange-600 text-xs tracking-[0.4em] uppercase mb-4">
        Engineer Profile
      </p>
      <h1 class="font-headline font-black uppercase tracking-tighter leading-[0.85] text-center"
          style="font-size: clamp(2.5rem, 9vw, 7rem)">
        AI Systems at <br/><span class="text-orange-600">Full Velocity</span>
      </h1>
      <p class="mt-6 max-w-xl text-center text-zinc-400 text-sm md:text-base">
        I build AI agents and apps that automate workflows, integrate with OpenClaw,
        and follow industry-standard security.
      </p>
    </div>

    <div id="frame2" class="absolute inset-0 …" style="opacity:0" inert> … </div>
    <div id="frame3" class="absolute inset-0 …" style="opacity:0" inert> … </div>
  </div>
</section>
```

```js
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hero = document.getElementById('hero');
  var f1 = document.getElementById('frame1'),
      f2 = document.getElementById('frame2'),
      f3 = document.getElementById('frame3');

  // Cached geometry — refreshed on resize only.
  var heroTop = 0, travelable = 1, vh = 0, inView = false;
  function measure() {
    vh = window.innerHeight;
    heroTop = hero.offsetTop;
    travelable = Math.max(1, hero.offsetHeight - vh);
  }
  measure();
  window.addEventListener('resize', measure, { passive: true });

  new IntersectionObserver(function (e) { inView = e[0].isIntersecting; })
    .observe(hero);

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ramp = function (p, a, b) { return clamp01((p - a) / (b - a)); };

  function setPhase(el, o) {
    el.style.opacity = o;
    if (o < 0.02) { el.setAttribute('inert', ''); el.style.pointerEvents = 'none'; }
    else          { el.removeAttribute('inert'); el.style.pointerEvents = 'auto'; }
  }

  function update() {
    if (!inView || reduce.matches) return;
    var p = clamp01((window.scrollY - heroTop) / travelable);   // 0 → 1

    setPhase(f1, 1 - ramp(p, 0.30, 0.40));                       // out 30–40%
    setPhase(f2, ramp(p, 0.25, 0.35) * (1 - ramp(p, 0.60, 0.70)));// in 25–35, out 60–70
    setPhase(f3, ramp(p, 0.65, 0.75));                           // in 65–75, holds to 1
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }, { passive: true });

  reduce.addEventListener('change', function () { location.reload(); });
  update();   // paint correct phase on load / refresh mid-hero
})();
```

```css
/* Reduced-motion fallback: collapse the pin into a readable stack. */
@media (prefers-reduced-motion: reduce) {
  #hero { height: auto; }
  #hero > div { position: static; height: auto; overflow: visible; }
  #hero [id^="frame"] {
    position: static;
    opacity: 1 !important;
    transform: none !important;
    pointer-events: auto !important;
    min-height: auto;
    padding: 4rem 1.5rem;
  }
  #seqCanvas { display: none; }
  .star, .danger-tape, .danger-tape-reverse, #hud-grid { animation: none !important; }
}
```

**Reviewer's pass:** walk §4, then §5, then run §6.4's greps and the §6.3 checklist. Any unchecked box is a rejection, not a nit.
