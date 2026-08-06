'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, ChevronDown, ChevronRight,
  ExternalLink, Image, Code, ArrowRight, Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhiskConfig {
  subject: string;
  material: string;
  lighting: string;
  surface: string;
  bgDescription: string;
  renderQuality: string;
  aesthetic: string;
  constraints: string;
}

interface CursorConfig {
  productName: string;
  subject: string;
  accentColor: string;
  bgColor: string;
  headline: string;
  subtext: string;
  frameCount: number;
}

type GeneratorTab = 'whisk' | 'cursor';

// ─── Static data ─────────────────────────────────────────────────────────────

const SUBJECT_PRESETS = [
  { label: 'Rocket',     value: 'rocket on launch pad' },
  { label: 'F1 Car',     value: 'Formula 1 car' },
  { label: 'Headphones', value: 'wireless headphones' },
  { label: 'Watch',      value: 'luxury mechanical wristwatch' },
  { label: 'Sneaker',    value: 'premium athletic sneaker' },
  { label: 'Camera',     value: 'mirrorless camera body' },
];

const PHASES = [
  {
    number: '01',
    label: 'Discovery',
    time: '15 min',
    goal: 'Lock the visual identity before touching code.',
    steps: [
      'Define the hero object — what single thing best represents the brand?',
      'Choose a color palette anchored to that object',
      'Collect 3–5 reference sites (Awwwards, Dribbble, competitor)',
      'Note the exact background hex — it must match your Whisk frame bg exactly',
    ],
    output: 'Creative brief: object, palette, bg hex, tagline direction',
    tools: [],
  },
  {
    number: '02',
    label: 'Hero Frame Production',
    time: '30 min',
    goal: 'Generate Frame A (intact) and Frame B (exploded) using Google Whisk.',
    steps: [
      'Use the Whisk Prompt Generator below to build your Frame A prompt',
      'Generate Frame A — object fully assembled, clean background',
      'Copy the Frame B prompt (auto-appends the exploded view instruction)',
      'Generate Frame B — same object, all components floating apart',
      'Both images must have identical backgrounds so edges disappear on the site',
    ],
    output: 'Two images: intact state + exploded state',
    tools: ['Google Whisk'],
  },
  {
    number: '03',
    label: 'Animation & Frame Extraction',
    time: '20 min',
    goal: 'Turn the two images into ~240 individual scroll frames.',
    steps: [
      'Open Google Veo → "Frames to Video" → upload Frame A and Frame B',
      'Veo interpolates all in-between motion automatically',
      'Download the MP4',
      'Upload to EZGif → set 30fps → extract frames → download ZIP',
      'Convert all frames to WebP (cwebp -q 85) — target total < 8 MB',
      'Place in public/frames/ named frame-001.webp … frame-240.webp',
    ],
    output: '~240 WebP frames in public/frames/',
    tools: ['Google Veo', 'EZGif', 'cwebp'],
  },
  {
    number: '04',
    label: 'Project Setup',
    time: '10 min',
    goal: 'Scaffold or continue an existing Next.js project.',
    steps: [
      'New project: npx create-next-app@latest [name] --typescript --tailwind --app',
      'Existing project: ensure Next.js 14+ App Router is in use',
      'npm install framer-motion gsap',
      'Verify public/frames/ folder has your WebP sequence',
    ],
    output: 'Running dev server, deps installed',
    tools: ['Next.js', 'Framer Motion'],
  },
  {
    number: '05',
    label: 'Build with Cursor AI',
    time: '15 min',
    goal: 'Generate the Canvas scroll component using the Cursor Prompt Generator below.',
    steps: [
      'Use the Cursor AI Prompt Generator below — fill in your details',
      'Open Cursor → Agent mode → paste the generated prompt',
      'Cursor builds: HeroCanvas.tsx, useScrollProgress.ts, HeroSection.tsx',
      'Verify 60fps on desktop; confirm mobile fallback (every other frame)',
      'Check canvas bg exactly matches your frame background hex',
    ],
    output: 'Scroll-linked frame animation running in browser',
    tools: ['Cursor AI'],
  },
  {
    number: '06',
    label: 'Section Architecture',
    time: '20 min',
    goal: 'Build the remaining page sections with entrance animations.',
    steps: [
      'Hero + Scroll Animation — first impression, sets the tone',
      'About — who you are, context and trust',
      'Skills / Stack — technical credibility',
      'Projects — proof of work',
      'Services / Pricing — commercial proposition',
      'Contact / CTA — conversion moment',
      'Wrap each section: Framer Motion whileInView, once: true, y: 20 → 0',
    ],
    output: 'All sections complete with viewport-triggered animations',
    tools: ['Framer Motion'],
  },
  {
    number: '07',
    label: 'Performance Gate',
    time: '15 min',
    goal: 'No deploy until all targets are met.',
    steps: [
      'npm run build — zero errors, zero type warnings',
      'Lighthouse Performance ≥ 90',
      'LCP < 1.2s, CLS < 0.1, INP < 100ms',
      'JS bundle < 200 kB, frame assets < 8 MB total',
      'Run cwebp if frames exceed size limit',
    ],
    output: 'Green build + green Lighthouse',
    tools: ['Lighthouse', 'cwebp'],
  },
  {
    number: '08',
    label: 'Commit & Ship',
    time: '5 min',
    goal: 'Only after build passes.',
    steps: [
      'git add src/components/HeroCanvas.tsx public/frames/',
      'git commit -m "feat: scroll animation hero with frame sequence"',
      'npm run build — final check',
      'git push origin main',
    ],
    output: 'Live on production',
    tools: ['Git', 'Vercel'],
  },
];

const TOOLS = [
  { name: 'Google Whisk', purpose: 'Generate hero frame images (intact + exploded)', free: true,  url: 'https://labs.google/fx/tools/whisk' },
  { name: 'Google Veo',   purpose: 'Animate between two images ("Frames to Video")', free: true,  url: 'https://deepmind.google/technologies/veo/' },
  { name: 'EZGif',        purpose: 'Extract ~240 frames from video at 30fps',         free: true,  url: 'https://ezgif.com/video-to-jpg' },
  { name: 'Cursor AI',    purpose: 'Build the Canvas scroll component via Agent mode', free: false, url: 'https://cursor.sh/' },
  { name: 'cwebp',        purpose: 'Compress frames to WebP (target < 8 MB total)',   free: true,  url: 'https://developers.google.com/speed/webp/download' },
  { name: 'Lighthouse',   purpose: 'Performance audit — target score ≥ 90',           free: true,  url: 'https://developer.chrome.com/docs/lighthouse/' },
];

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildWhiskFrameA(c: WhiskConfig): string {
  return [
    `Ultra-premium product photography of ${c.subject}`,
    c.material,
    c.lighting,
    c.surface,
    c.bgDescription,
    c.renderQuality,
    c.aesthetic,
    c.constraints,
  ].filter(Boolean).join(', ') + '.';
}

function buildWhiskFrameB(c: WhiskConfig): string {
  return (
    buildWhiskFrameA(c).replace(/\.$/, '') +
    ', exploded view with all components separated and floating apart,' +
    ' each individual piece clearly visible, same lighting and background.'
  );
}

function buildCursorPrompt(c: CursorConfig): string {
  const paddedMax    = String(c.frameCount).padStart(3, '0');
  const mobileFrames = Math.round(c.frameCount / 2);
  return `ACT AS:
A world-class Creative Developer (Awwwards-level) specializing in Next.js,
Framer Motion, and scroll-based animations.

THE TASK:
Build a high-end "Scrollytelling" landing page for "${c.productName}".
The hero object is: ${c.subject}.

The core mechanic is a scroll-linked animation that plays an image sequence
(${c.frameCount} frames) as the user scrolls down.

TECH STACK:
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Animation: Framer Motion
- Rendering: HTML5 Canvas (for performance)

VISUAL DIRECTION & COLOR:
- Seamless Blending: The website background MUST match the frame background
  exactly (${c.bgColor}) so image edges are invisible.
- Page background: "${c.bgColor}". Accent color: "${c.accentColor}".
- Headings: text-white/90. Body: text-white/60.
- Typography: Inter or Space Grotesk. Clean, tracking-tight, minimalist.

INTERACTION:
- Scroll scrubs the image sequence forward/backward frame-by-frame.
- 60fps via requestAnimationFrame.
- Mobile: use every other frame (${mobileFrames} frames) for performance.
- Preload all frames on mount with Image() + img.decode(); show loading progress.
- Parallax text overlays: "${c.headline}" and "${c.subtext}" fade in at 30%
  scroll, fade out at 70%.

STRUCTURE:
- Hero with "Scroll to Explore" prompt
- Sticky scroll container: height = 400vh
- Canvas element fills viewport (100vw × 100vh)
- Footer CTA section

COMPONENTS:
1. HeroCanvas.tsx — Canvas renderer, accepts progress prop (0–1)
2. useScrollProgress.ts — hook returning scroll % through a target ref
3. HeroSection.tsx — sticky wrapper + text overlays composition

PERFORMANCE:
- IntersectionObserver — pause rAF when canvas is off-screen
- img.decode() before storing frames
- Canvas bg: ${c.bgColor}
- Scale image to cover canvas, maintain aspect ratio

Frames: /frames/frame-[NNN].webp (001 to ${paddedMax}, zero-padded).
Use best practices for performance, accessibility, and responsive design.`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-sm font-medium transition-all duration-150 cursor-pointer"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function PromptOutput({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">{label}</span>
          <CopyButton text={text} label="Copy prompt" />
        </div>
      )}
      {!label && (
        <div className="flex justify-end">
          <CopyButton text={text} label="Copy prompt" />
        </div>
      )}
      <pre className="whitespace-pre-wrap text-xs text-white/60 bg-white/[0.03] border border-white/10 rounded-xl p-5 overflow-auto max-h-72 font-mono leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">
        {label}
        {hint && <span className="ml-1.5 normal-case font-normal text-white/30">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-[#111111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all duration-150';

// ─── Whisk Generator ─────────────────────────────────────────────────────────

function WhiskGenerator() {
  const [config, setConfig] = useState<WhiskConfig>({
    subject: '',
    material: '',
    lighting: 'soft ambient lighting from top-left',
    surface: 'floating on matte black surface',
    bgDescription: 'deep black background with subtle gradient',
    renderQuality: 'studio lighting, hyper-realistic 3D render, shallow depth of field, 4K cinematic quality',
    aesthetic: 'luxury product aesthetic, sharp focus on subject, modern minimalist composition',
    constraints: 'no text, no logos',
  });

  const [result, setResult] = useState<{ a: string; b: string } | null>(null);

  const set = <K extends keyof WhiskConfig>(k: K, v: WhiskConfig[K]) =>
    setConfig(prev => ({ ...prev, [k]: v }));

  const generate = () => {
    if (!config.subject.trim()) return;
    setResult({ a: buildWhiskFrameA(config), b: buildWhiskFrameB(config) });
  };

  return (
    <div className="space-y-6">
      {/* Subject */}
      <Field label="Subject" hint="the hero object in your animation">
        <input
          value={config.subject}
          onChange={e => set('subject', e.target.value)}
          className={inputCls}
          placeholder="e.g. wireless headphones, rocket on launch pad, F1 car"
        />
        <div className="flex flex-wrap gap-2 pt-2">
          {SUBJECT_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => set('subject', p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer ${
                config.subject === p.value
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Material & Finish">
          <input
            value={config.material}
            onChange={e => set('material', e.target.value)}
            className={inputCls}
            placeholder="matte black finish with brushed aluminum accents"
          />
        </Field>

        <Field label="Lighting">
          <input
            value={config.lighting}
            onChange={e => set('lighting', e.target.value)}
            className={inputCls}
            placeholder="soft ambient lighting from top-left"
          />
        </Field>

        <Field label="Surface / Placement">
          <input
            value={config.surface}
            onChange={e => set('surface', e.target.value)}
            className={inputCls}
            placeholder="floating on matte black surface"
          />
        </Field>

        <Field label="Background" hint="must match your site bg hex">
          <input
            value={config.bgDescription}
            onChange={e => set('bgDescription', e.target.value)}
            className={inputCls}
            placeholder="deep black background with subtle gradient"
          />
        </Field>

        <Field label="Render Quality">
          <input
            value={config.renderQuality}
            onChange={e => set('renderQuality', e.target.value)}
            className={inputCls}
            placeholder="hyper-realistic 3D render, 4K cinematic quality"
          />
        </Field>

        <Field label="Aesthetic">
          <input
            value={config.aesthetic}
            onChange={e => set('aesthetic', e.target.value)}
            className={inputCls}
            placeholder="luxury product aesthetic, modern minimalist composition"
          />
        </Field>
      </div>

      <Field label="Constraints">
        <input
          value={config.constraints}
          onChange={e => set('constraints', e.target.value)}
          className={inputCls}
          placeholder="no text, no logos"
        />
      </Field>

      <button
        onClick={generate}
        disabled={!config.subject.trim()}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-150 cursor-pointer"
      >
        <Image className="w-4 h-4" />
        Generate Whisk Prompts
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 text-xs text-white/30">
              <div className="h-px flex-1 bg-white/10" />
              <span>Copy each prompt into Google Whisk separately</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center border border-orange-500/30">A</span>
                <span className="text-sm font-medium text-white/80">Frame A — Intact / assembled state</span>
              </div>
              <PromptOutput label="" text={result.a} />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-white/30">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Generate Frame A first, then Frame B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center justify-center border border-green-500/30">B</span>
                <span className="text-sm font-medium text-white/80">Frame B — Exploded / disassembled state</span>
              </div>
              <PromptOutput label="" text={result.b} />
            </div>

            <p className="text-xs text-white/30 leading-relaxed">
              After generating both images, upload them to{' '}
              <strong className="text-white/50">Google Veo → Frames to Video</strong>{' '}
              to animate between them, then extract frames in EZGif at 30fps.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Cursor Generator ─────────────────────────────────────────────────────────

function CursorGenerator() {
  const [config, setConfig] = useState<CursorConfig>({
    productName: '',
    subject: '',
    accentColor: '#FF4500',
    bgColor: '#050505',
    headline: '',
    subtext: '',
    frameCount: 240,
  });

  const [result, setResult] = useState<string | null>(null);

  const set = <K extends keyof CursorConfig>(k: K, v: CursorConfig[K]) =>
    setConfig(prev => ({ ...prev, [k]: v }));

  const isValid = config.productName.trim() && config.subject.trim();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Site / Product Name">
          <input
            value={config.productName}
            onChange={e => set('productName', e.target.value)}
            className={inputCls}
            placeholder="Code by Luis"
          />
        </Field>

        <Field label="Hero Object" hint="the animated subject">
          <input
            value={config.subject}
            onChange={e => set('subject', e.target.value)}
            className={inputCls}
            placeholder="rocket on launch pad"
          />
        </Field>

        <Field label="Background Hex" hint="must match frame background">
          <input
            value={config.bgColor}
            onChange={e => set('bgColor', e.target.value)}
            className={inputCls}
            placeholder="#050505"
          />
        </Field>

        <Field label="Accent Color">
          <input
            value={config.accentColor}
            onChange={e => set('accentColor', e.target.value)}
            className={inputCls}
            placeholder="#FF4500"
          />
        </Field>

        <Field label="Hero Headline">
          <input
            value={config.headline}
            onChange={e => set('headline', e.target.value)}
            className={inputCls}
            placeholder="Full-Stack. Full Throttle."
          />
        </Field>

        <Field label="Subtext / Tagline">
          <input
            value={config.subtext}
            onChange={e => set('subtext', e.target.value)}
            className={inputCls}
            placeholder="From Idea to Launch — At Race Pace."
          />
        </Field>

        <Field label="Frame Count" hint="from EZGif extraction">
          <input
            type="number"
            min={60}
            max={480}
            value={config.frameCount}
            onChange={e => set('frameCount', parseInt(e.target.value) || 240)}
            className={inputCls}
          />
        </Field>
      </div>

      <button
        onClick={() => isValid && setResult(buildCursorPrompt(config))}
        disabled={!isValid}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-150 cursor-pointer"
      >
        <Zap className="w-4 h-4" />
        Generate Cursor AI Prompt
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <PromptOutput label="Cursor AI Agent Prompt — paste into Agent mode" text={result} />
            <p className="text-xs text-white/30">
              Open <strong className="text-white/50">Cursor → Agent mode</strong>, paste the prompt, and hit Enter.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Phase card ───────────────────────────────────────────────────────────────

function PhaseCard({ phase, index }: { phase: typeof PHASES[0]; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
        aria-expanded={open}
      >
        <span className="font-mono text-xs text-orange-400/60 w-6 shrink-0">{phase.number}</span>
        <span className="flex-1 font-semibold text-white/90 text-sm">{phase.label}</span>
        <span className="text-xs text-white/40 mr-3 tabular-nums">{phase.time}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 space-y-4 border-t border-white/5 pt-4">
              <p className="text-sm text-white/50 italic">{phase.goal}</p>

              <ul className="space-y-2">
                {phase.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/70 leading-snug">
                    <span className="text-orange-400 mt-0.5 shrink-0">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 pt-1">
                {phase.output && (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                    {phase.output}
                  </span>
                )}
                {phase.tools.map(t => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkflowClient() {
  const [activeTab, setActiveTab] = useState<GeneratorTab>('whisk');

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-orange-500/10 border border-orange-500/20 text-orange-400">
            SCROLL ANIMATION WORKFLOW
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Website Build{' '}
            <span className="text-orange-400">Workflow</span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl leading-relaxed">
            Generate frame-based scroll animations for any website — from image generation in Google Whisk, through Veo and EZGif, to a production Canvas component built with Cursor AI.
          </p>
        </motion.div>

        {/* Tool pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap gap-2"
        >
          {TOOLS.map(t => (
            <a
              key={t.name}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:border-orange-500/30 hover:bg-white/[0.06] text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-150"
            >
              {t.name}
              {t.free && (
                <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-semibold border border-green-500/20">
                  Free
                </span>
              )}
              <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-orange-400/60 transition-colors" />
            </a>
          ))}
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-10 pb-24">

        {/* Phases */}
        <section>
          <h2 className="text-lg font-semibold text-white/80 mb-4">The Process</h2>
          <div className="space-y-2">
            {PHASES.map((phase, i) => (
              <PhaseCard key={phase.number} phase={phase} index={i} />
            ))}
          </div>
        </section>

        {/* Prompt Generators */}
        <section>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-white/10">
              {([
                { id: 'whisk',  Icon: Image, label: 'Google Whisk',  sub: 'Frame A + Frame B prompts' },
                { id: 'cursor', Icon: Code,  label: 'Cursor AI',     sub: 'Canvas scroll component' },
              ] as const).map(({ id, Icon, label, sub }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 transition-colors duration-150 cursor-pointer border-b-2 ${
                      active
                        ? 'border-orange-500 bg-white/[0.03]'
                        : 'border-transparent hover:bg-white/[0.02]'
                    }`}
                    aria-selected={active}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-orange-400' : 'text-white/30'}`} />
                    <div className="text-left">
                      <div className={`text-sm font-semibold ${active ? 'text-white/90' : 'text-white/50'}`}>
                        {label}
                      </div>
                      <div className="text-xs text-white/30 hidden sm:block">{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'whisk' ? (
                  <motion.div
                    key="whisk"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <WhiskGenerator />
                  </motion.div>
                ) : (
                  <motion.div
                    key="cursor"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CursorGenerator />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <p className="text-xs text-center text-white/20 pb-2">
          Scroll Animation Workflow · v1.1 · April 2026
        </p>
      </div>
    </div>
  );
}
