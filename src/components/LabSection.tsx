"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Gamepad2, BrainCircuit, Target, Timer, Trophy,
  ExternalLink, Grid3X3, Play, Pause, SkipForward, Trash2, Shuffle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "reflex" | "life" | "projects";

interface GameTarget {
  id: number;
  x: number;
  y: number;
}

interface AIProject {
  name: string;
  tagline: string;
  prompt: string;
  tech: string[];
  link?: string;
}

// ─── Conway preset patterns ───────────────────────────────────────────────────
// Each entry is [row, col] offsets from center of grid

const PATTERNS: Record<string, [number, number][]> = {
  glider: [
    [0, 1], [1, 2], [2, 0], [2, 1], [2, 2],
  ],
  blinker: [
    [0, 0], [0, 1], [0, 2],
  ],
  rpentomino: [
    [0, 1], [0, 2], [1, 0], [1, 1], [2, 1],
  ],
  pulsar: [
    [-6,-4],[-6,-3],[-6,-2],[-6,2],[-6,3],[-6,4],
    [-4,-6],[-4,-1],[-4,1],[-4,6],
    [-3,-6],[-3,-1],[-3,1],[-3,6],
    [-2,-6],[-2,-1],[-2,1],[-2,6],
    [-1,-4],[-1,-3],[-1,-2],[-1,2],[-1,3],[-1,4],
    [1,-4],[1,-3],[1,-2],[1,2],[1,3],[1,4],
    [2,-6],[2,-1],[2,1],[2,6],
    [3,-6],[3,-1],[3,1],[3,6],
    [4,-6],[4,-1],[4,1],[4,6],
    [6,-4],[6,-3],[6,-2],[6,2],[6,3],[6,4],
  ],
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const AI_PROJECTS: AIProject[] = [
  {
    name: "NanoClaw / OpenClaw",
    tagline: "Autonomous AI coding agent built on Claude",
    prompt: `> claude-code --prompt "Build a lightweight agentic loop
  that reads a task, plans steps, calls tools, and
  iterates until done. Keep it under 300 lines."`,
    tech: ["Claude API", "TypeScript", "Tool Use", "Agentic Loop"],
    link: "https://github.com/blastheart1",
  },
  {
    name: "Portfolio Chatbot",
    tagline: "Context-aware AI assistant for this portfolio",
    prompt: `> claude-code --prompt "Create a streaming chatbot
  with a system prompt that knows my resume, projects,
  and services. Answer as me, stay on-brand."`,
    tech: ["Claude Haiku 4.5", "Next.js", "Streaming SSE", "RAG"],
  },
  {
    name: "Intelligent QA Harness",
    tagline: "AI-assisted test generation for IBM ODM rules",
    prompt: `> claude-code --prompt "Given a decision table,
  generate boundary-value and equivalence partition
  test cases automatically. Output as JSON fixtures."`,
    tech: ["Claude API", "IBM ODM", "Python", "Test Gen"],
  },
];

// ─── Typing animation hook ────────────────────────────────────────────────────

function useTyping(text: string, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);

  return { displayed, done };
}

// ─── Reflex Game ──────────────────────────────────────────────────────────────

function ReflexGame() {
  const GAME_DURATION = 60;
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [target, setTarget] = useState<GameTarget | null>(null);
  const [missed, setMissed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnTarget = useCallback(() => {
    setTarget({ id: Date.now(), x: 10 + Math.random() * 75, y: 10 + Math.random() * 75 });
    targetTimerRef.current = setTimeout(() => {
      setTarget(null);
      setMissed(m => m + 1);
      spawnTarget();
    }, 1500);
  }, []);

  const startGame = () => {
    setScore(0); setMissed(0); setTimeLeft(GAME_DURATION); setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing") return;
    spawnTarget();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          clearTimeout(targetTimerRef.current!);
          setTarget(null);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(timerRef.current!); clearTimeout(targetTimerRef.current!); };
  }, [phase, spawnTarget]);

  const handleHit = () => {
    if (phase !== "playing" || !target) return;
    clearTimeout(targetTimerRef.current!);
    setScore(s => s + 1);
    setTarget(null);
    spawnTarget();
  };

  const accuracy = score + missed > 0 ? Math.round((score / (score + missed)) * 100) : 0;

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-3 text-xs text-green-400">
        <span className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" />{timeLeft}s</span>
        <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />hits: {score}</span>
        <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" />acc: {accuracy}%</span>
      </div>

      <div className="relative w-full bg-gray-950 border border-green-900/40 rounded-xl overflow-hidden select-none" style={{ height: 280 }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(#0f0 1px, transparent 1px), linear-gradient(90deg, #0f0 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <p className="text-green-500 text-sm text-center px-8">Click targets as they appear. You have 60 seconds.</p>
            <button onClick={startGame} className="px-6 py-2 border border-green-500/50 text-green-400 text-sm rounded-lg hover:bg-green-950/60 transition-colors">
              <span className="mr-2">▶</span> ./start_game.sh
            </button>
          </div>
        )}

        {phase === "playing" && (
          <AnimatePresence>
            {target && (
              <motion.button
                key={target.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ left: `${target.x}%`, top: `${target.y}%`, transform: "translate(-50%, -50%)" }}
                className="absolute w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center cursor-pointer hover:bg-green-400/30"
                onClick={handleHit}
                aria-label="Click target"
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </motion.button>
            )}
          </AnimatePresence>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-green-400 text-base font-bold">{'// session complete'}</p>
            <p className="text-green-400 text-sm">score: {score} hits · accuracy: {accuracy}%</p>
            {score >= 30 && <p className="text-yellow-400/80 text-xs">⚡ faster than my CI pipeline</p>}
            {score < 30 && score >= 15 && <p className="text-green-500 text-xs">📈 solid. keep iterating.</p>}
            {score < 15 && <p className="text-green-600 text-xs">🐢 even turtles ship eventually</p>}
            <button onClick={startGame} className="mt-1 px-5 py-1.5 border border-green-500/50 text-green-400 text-xs rounded-lg hover:bg-green-950/60 transition-colors">retry</button>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-green-500/60" initial={{ width: "100%" }} animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }} transition={{ duration: 1, ease: "linear" }} />
        </div>
      )}
    </div>
  );
}

// ─── Conway's Game of Life ────────────────────────────────────────────────────
// Looks like a simple "click squares to toggle, press play" toy.
// Under the hood: flat Uint8Array double-buffer, neighbor-sum loop,
// toroidal boundary wrapping, rAF-driven render loop decoupled from
// React state, canvas pixel rendering for O(1) draw per cell.

const COLS = 60;
const ROWS = 32;
const CELL = 10; // px

function makeEmpty(): Uint8Array {
  return new Uint8Array(COLS * ROWS);
}

function idx(r: number, c: number) {
  // Toroidal (wrapping) boundary
  return ((r + ROWS) % ROWS) * COLS + ((c + COLS) % COLS);
}

function step(grid: Uint8Array): Uint8Array {
  const next = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const alive = grid[idx(r, c)];
      const neighbors =
        grid[idx(r - 1, c - 1)] + grid[idx(r - 1, c)] + grid[idx(r - 1, c + 1)] +
        grid[idx(r,     c - 1)] +                        grid[idx(r,     c + 1)] +
        grid[idx(r + 1, c - 1)] + grid[idx(r + 1, c)] + grid[idx(r + 1, c + 1)];
      // Classic Conway rules: B3/S23
      next[idx(r, c)] = alive ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : (neighbors === 3 ? 1 : 0);
    }
  }
  return next;
}

function applyPattern(grid: Uint8Array, name: keyof typeof PATTERNS): Uint8Array {
  const next = new Uint8Array(grid);
  const cells = PATTERNS[name];
  const cr = Math.floor(ROWS / 2);
  const cc = Math.floor(COLS / 2);
  for (const [dr, dc] of cells) {
    next[idx(cr + dr, cc + dc)] = 1;
  }
  return next;
}

function randomGrid(): Uint8Array {
  const g = new Uint8Array(COLS * ROWS);
  for (let i = 0; i < g.length; i++) g[i] = Math.random() < 0.3 ? 1 : 0;
  return g;
}

function ConwayGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Uint8Array>(makeEmpty());
  const runningRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const [running, setRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [liveCells, setLiveCells] = useState(0);
  const [speed, setSpeed] = useState(150); // ms per generation

  // Draw grid to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#030712"; // gray-950
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    const grid = gridRef.current;
    ctx.fillStyle = "#4ade80"; // green-400
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[idx(r, c)]) {
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
    // Grid lines
    ctx.strokeStyle = "rgba(74,222,128,0.06)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke();
    }
  }, []);

  // Animation loop — runs outside React state for perf
  const loop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;
    if (timestamp - lastTickRef.current >= speed) {
      gridRef.current = step(gridRef.current);
      lastTickRef.current = timestamp;
      draw();
      const live = gridRef.current.reduce((a, v) => a + v, 0);
      setGeneration(g => g + 1);
      setLiveCells(live);
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, speed]);

  const startLoop = useCallback(() => {
    runningRef.current = true;
    setRunning(true);
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const togglePlay = () => running ? stopLoop() : startLoop();

  const stepOnce = () => {
    if (running) return;
    gridRef.current = step(gridRef.current);
    draw();
    const live = gridRef.current.reduce((a, v) => a + v, 0);
    setGeneration(g => g + 1);
    setLiveCells(live);
  };

  const clear = () => {
    stopLoop();
    gridRef.current = makeEmpty();
    draw();
    setGeneration(0);
    setLiveCells(0);
  };

  const randomize = () => {
    stopLoop();
    gridRef.current = randomGrid();
    draw();
    setGeneration(0);
    setLiveCells(gridRef.current.reduce((a, v) => a + v, 0));
  };

  const loadPattern = (name: keyof typeof PATTERNS) => {
    stopLoop();
    gridRef.current = applyPattern(makeEmpty(), name);
    draw();
    setGeneration(0);
    setLiveCells(gridRef.current.reduce((a, v) => a + v, 0));
  };

  // Canvas click → toggle cell
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = (COLS * CELL) / rect.width;
    const scaleY = (ROWS * CELL) / rect.height;
    const c = Math.floor((e.clientX - rect.left) * scaleX / CELL);
    const r = Math.floor((e.clientY - rect.top) * scaleY / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const i = idx(r, c);
    const next = new Uint8Array(gridRef.current);
    next[i] = next[i] ? 0 : 1;
    gridRef.current = next;
    draw();
    setLiveCells(next.reduce((a, v) => a + v, 0));
  };

  // Initial draw
  useEffect(() => { draw(); return () => cancelAnimationFrame(rafRef.current); }, [draw]);

  // Re-render when speed changes mid-run
  useEffect(() => {
    if (running) { stopLoop(); startLoop(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  return (
    <div className="font-mono">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3 text-xs text-green-400">
        <span className="flex items-center gap-1.5"><Grid3X3 className="w-3.5 h-3.5" />gen: {generation}</span>
        <span>live: {liveCells}</span>
        <span className={running ? "text-green-400 animate-pulse" : "text-gray-500"}>
          {running ? "● running" : "○ paused"}
        </span>
      </div>

      {/* Canvas */}
      <div className="overflow-auto rounded-xl border border-green-900/30">
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          onClick={handleCanvasClick}
          className="block cursor-crosshair w-full"
          style={{ imageRendering: "pixelated" }}
          aria-label="Conway's Game of Life grid"
        />
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-green-500/40 text-green-400 text-xs rounded-lg hover:bg-green-950/50 transition-colors"
        >
          {running ? <><Pause className="w-3 h-3" />pause</> : <><Play className="w-3 h-3" />play</>}
        </button>

        {/* Step */}
        <button
          onClick={stepOnce}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-green-900/40 text-green-500 text-xs rounded-lg hover:bg-green-950/40 disabled:opacity-30 transition-colors"
        >
          <SkipForward className="w-3 h-3" />step
        </button>

        {/* Random */}
        <button
          onClick={randomize}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-green-900/40 text-green-500 text-xs rounded-lg hover:bg-green-950/40 transition-colors"
        >
          <Shuffle className="w-3 h-3" />random
        </button>

        {/* Clear */}
        <button
          onClick={clear}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/40 text-red-400/60 text-xs rounded-lg hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="w-3 h-3" />clear
        </button>

        {/* Speed */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-green-600 text-xs">speed</span>
          <input
            type="range"
            min={50}
            max={500}
            step={50}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-20 accent-green-400"
            aria-label="Simulation speed"
          />
        </div>
      </div>

      {/* Pattern presets */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="text-green-700 text-[10px] self-center">presets:</span>
        {(Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).map(name => (
          <button
            key={name}
            onClick={() => loadPattern(name)}
            className="px-2 py-0.5 text-[10px] rounded border border-green-900/30 text-green-600 hover:text-green-400 hover:border-green-500/50 transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── AI Projects ──────────────────────────────────────────────────────────────

function ProjectCard({ project, index }: { project: AIProject; index: number }) {
  const [visible, setVisible] = useState(false);
  const { displayed, done } = useTyping(project.prompt, 22, visible);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onViewportEnter={() => setVisible(true)}
      className="bg-gray-950 border border-green-900/30 rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-mono text-green-300 text-sm font-semibold">{project.name}</h4>
          <p className="text-gray-400 text-xs mt-0.5">{project.tagline}</p>
        </div>
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-green-400 transition-colors flex-shrink-0"
            aria-label={`View ${project.name} on GitHub`}>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="bg-black/60 rounded-lg p-3 text-xs font-mono text-green-400 whitespace-pre leading-relaxed min-h-[80px]">
        {displayed}
        {!done && <span className="inline-block w-1.5 h-3.5 bg-green-400 ml-0.5 animate-pulse align-middle" />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {project.tech.map(t => (
          <span key={t} className="px-2 py-0.5 rounded-full bg-green-950/60 text-green-400 text-[10px] font-mono border border-green-900/40">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LabSection() {
  const [activeTab, setActiveTab] = useState<Tab>("reflex");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "reflex",   label: "reflex_game.exe", icon: <Gamepad2 className="w-4 h-4" /> },
    { id: "life",     label: "game_of_life.c",  icon: <Grid3X3 className="w-4 h-4" /> },
    { id: "projects", label: "ai_projects/",    icon: <BrainCircuit className="w-4 h-4" /> },
  ];

  return (
    <section id="lab" className="py-20 px-6 max-w-6xl mx-auto">
      <motion.div className="mb-10" initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-3">
          <FlaskConical className="w-6 h-6 text-green-400" />
          <span className="font-mono text-green-500 text-sm">~/lab $ ls -la</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
          The Lab.<br />
          <span className="text-gray-400 dark:text-gray-500 font-normal">Built with Claude Code.</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gray-900 dark:bg-gray-950 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl"
      >
        {/* Terminal top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="font-mono text-gray-400 text-xs">portfolio — lab</span>
          <div className="w-12" />
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-700/50 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-mono whitespace-nowrap transition-colors border-b-2 flex-shrink-0 ${
                activeTab === tab.id
                  ? "border-green-400 text-green-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            {activeTab === "reflex" && (
              <motion.div key="reflex" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                <p className="font-mono text-green-600 text-xs mb-4">{'// 60s reflex challenge \u2014 generated by claude code'}</p>
                <ReflexGame />
              </motion.div>
            )}

            {activeTab === "life" && (
              <motion.div key="life" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                <p className="font-mono text-green-600 text-xs mb-4">
                  {'// Conway\'s Game of Life \u2014 B3/S23 automaton \u00b7 click cells \u00b7 toroidal grid'}
                </p>
                <ConwayGame />
              </motion.div>
            )}

            {activeTab === "projects" && (
              <motion.div key="projects" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                <p className="font-mono text-green-600 text-xs mb-4">{'// prompts that shipped real products'}</p>
                <div className="grid gap-4">
                  {AI_PROJECTS.map((project, i) => (
                    <ProjectCard key={project.name} project={project} index={i} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
