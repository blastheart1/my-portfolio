'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';

import {
  AUTOMATION_FLOWS,
  NODE_KIND_LABEL,
  FAILURE_LABEL,
  type FlowNode,
} from '@/lib/automation-flows';
import { runOrder, nodeStates } from '@/lib/automation-runner';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { Play, Pause, SkipForward, RotateCcw, AlertTriangle } from 'lucide-react';
import DemoIntro, { AUTOMATION_INTRO } from './DemoIntro';

// Loaded on demand: React Flow is ~55KB gzipped and the mobile view never
// mounts it. ssr:false because it measures the DOM to fit the view.
const AutomationCanvas = dynamic(() => import('./AutomationCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center text-sm text-gray-400">
      Loading the canvas…
    </div>
  ),
});

/**
 * The automation lab.
 *
 * Each flow is a column of steps that expand. The visual distinction between
 * kinds is the substance, not decoration: it is what lets someone see at a
 * glance that the money-touching steps are deterministic and the model only
 * ever suggests.
 *
 * Colour alone never carries the meaning — every node also shows its kind in
 * words, so this survives being read in greyscale or by someone who cannot
 * distinguish the hues.
 */

/** One neutral treatment; the kind label carries the meaning. */
const KIND_BADGE = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

function Node({ node, index, showFailures }: { node: FlowNode; index: number; showFailures: boolean }) {
  const [open, setOpen] = React.useState(false);
  const detailId = `${node.id}-detail`;

  return (
    <li className="border-l border-gray-200 pl-4 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={detailId}
        className="group flex w-full items-start justify-between gap-3 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{node.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${KIND_BADGE}`}>
              {NODE_KIND_LABEL[node.kind]}
            </span>
          </span>
          <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
            {showFailures && node.onFailure
              ? `${FAILURE_LABEL[node.onFailure.behaviour]} — ${node.onFailure.detail}`
              : `${node.input} → ${node.output}`}
          </span>
        </span>

        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <p
          id={detailId}
          className="pb-4 pr-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
        >
          {node.detail}
        </p>
      )}
    </li>
  );
}

export default function AutomationFlowExplorer() {
  const [activeId, setActiveId] = React.useState(AUTOMATION_FLOWS[0].id);
  const [selected, setSelected] = React.useState<FlowNode | null>(null);
  const [showFailures, setShowFailures] = React.useState(false);
  const active = AUTOMATION_FLOWS.find(f => f.id === activeId) ?? AUTOMATION_FLOWS[0];

  const reducedMotion = usePrefersReducedMotion();

  // Which run is being shown. Defaults to the first, which is always the happy
  // path; the rest are the edge cases the flow was actually built for.
  const [scenarioId, setScenarioId] = React.useState(active.scenarios?.[0]?.id);
  const scenario = active.scenarios?.find(s => s.id === scenarioId) ?? active.scenarios?.[0];

  const order = React.useMemo(() => runOrder(active, scenario), [active, scenario]);

  // -1 means "not running". Advancing is a timeout chain rather than an
  // interval so pausing cannot leave one queued tick still pending.
  const [cursor, setCursor] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);

  React.useEffect(() => {
    if (!playing) return;
    if (cursor >= order.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setCursor(c => c + 1), 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, cursor, order.length]);

  // Unmounting or switching flow must leave nothing pending.
  React.useEffect(() => stop, [stop]);

  const step = () => {
    stop();
    setCursor(c => {
      const next = Math.min(c + 1, order.length - 1);
      setSelected(active.nodes.find(n => n.id === order[next]) ?? null);
      return next;
    });
  };

  const reset = () => {
    stop();
    setCursor(-1);
    setSelected(null);
  };

  const activeNodeId = cursor >= 0 ? order[cursor] : null;
  const states = React.useMemo(
    () => nodeStates(active, cursor, scenario),
    [active, cursor, scenario]
  );

  React.useEffect(() => {
    if (activeNodeId) setSelected(active.nodes.find(n => n.id === activeNodeId) ?? null);
  }, [activeNodeId, active.nodes]);

  return (
    <>
      <DemoIntro {...AUTOMATION_INTRO} />

      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,15rem)_1fr]">
      <div>
      {/* A uniform list, not pills. Twelve titles of differing length wrapped
          into an uneven tag cloud, and it did not match the examples list in
          the other demo. Same visual language, fixed row height, one-line
          summary. */}
      <div className="hidden md:block">
        <h3 className="text-xs uppercase tracking-wide text-gray-400">Workflows</h3>
        <ul className="mt-3 space-y-1">
          {AUTOMATION_FLOWS.map(flow => (
            <li key={flow.id}>
              <button
                type="button"
                aria-current={flow.id === activeId}
                onClick={() => {
                  stop();
                  setCursor(-1);
                  setActiveId(flow.id);
                  setScenarioId(flow.scenarios?.[0]?.id);
                  setSelected(null);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  flow.id === activeId
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                }`}
              >
                <span className="block truncate text-sm font-medium">{flow.title}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {flow.nodes.length} steps
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Below md a sidebar plus a canvas does not fit, so the same choice is
          a native select. */}
      <label className="block md:hidden">
        <span className="text-xs uppercase tracking-wide text-gray-400">Workflow</span>
        <select
          value={activeId}
          onChange={e => {
            const next = AUTOMATION_FLOWS.find(f => f.id === e.target.value);
            stop();
            setCursor(-1);
            setActiveId(e.target.value);
            setScenarioId(next?.scenarios?.[0]?.id);
            setSelected(null);
          }}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2
                     text-sm dark:border-gray-700"
        >
          {AUTOMATION_FLOWS.map(flow => (
            <option key={flow.id} value={flow.id}>
              {flow.title}
            </option>
          ))}
        </select>
      </label>

      </div>

      <div className="min-w-0">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-gray-400">The problem</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {active.problem}
          </p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-gray-400">After</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {active.outcome}
          </p>
        </div>
      </div>

      {active.scenarios && active.scenarios.length > 1 && (
        <div className="mt-6">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">Scenario</span>
            <select
              value={scenario?.id}
              onChange={e => {
                stop();
                setCursor(-1);
                setSelected(null);
                setScenarioId(e.target.value);
              }}
              className="mt-1 block w-full max-w-md rounded-lg border border-gray-200 bg-transparent
                         px-3 py-2 text-sm dark:border-gray-700"
            >
              {active.scenarios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {scenario && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {scenario.summary}
            </p>
          )}
        </div>
      )}

      {/* Run controls. Under reduced motion the Play button is withheld and
          Step is the only advance, so nothing moves on its own but the same
          information is reachable. */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-gray-200 py-3 dark:border-gray-700">
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => (playing ? stop() : (setCursor(c => (c < 0 ? 0 : c)), setPlaying(true)))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm
                       font-medium text-white dark:bg-gray-100 dark:text-gray-900"
          >
            {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            {playing ? 'Pause' : 'Run it'}
          </button>
        )}

        <button
          type="button"
          onClick={step}
          disabled={cursor >= order.length - 1}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5
                     text-sm transition-colors hover:bg-gray-50 disabled:opacity-40
                     dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <SkipForward className="size-3.5" aria-hidden="true" />
          Step
        </button>

        <button
          type="button"
          onClick={reset}
          disabled={cursor < 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5
                     text-sm transition-colors hover:bg-gray-50 disabled:opacity-40
                     dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </button>

        <button
          type="button"
          aria-pressed={showFailures}
          onClick={() => setShowFailures(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm
                      transition-colors ${
                        showFailures
                          ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
        >
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          When it breaks
        </button>

        {cursor >= 0 && (
          <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
            Step {cursor + 1} of {order.length}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="text-gray-400">Running:</span>{' '}
        {scenario ? scenario.summary : active.sampleRecord}
      </p>

      {active.instances && (
        <p className="mt-1 text-xs text-gray-400">
          Deployed {active.instances.count} times — {active.instances.label}.
        </p>
      )}

      {/* Desktop: the canvas. Mobile: the list, because a pannable graph on a
          360px screen is unusable and the list already reads well. */}
      <div className="mt-8 hidden overflow-hidden rounded-lg border border-gray-200 md:block dark:border-gray-700">
        <AutomationCanvas
          flow={active}
          onSelect={setSelected}
          activeNodeId={activeNodeId}
          runStates={states}
          showFailures={showFailures}
        />
      </div>

      {selected && (
        <div className="mt-4 hidden rounded-lg border border-gray-200 p-4 md:block dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {selected.label}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${KIND_BADGE}`}>
              {NODE_KIND_LABEL[selected.kind]}
            </span>
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {selected.detail}
          </p>

          {selected.sample && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">Receives</dt>
                <dd className="mt-1 rounded bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                  {selected.sample.in}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">Produces</dt>
                <dd className="mt-1 rounded bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                  {selected.sample.out}
                </dd>
              </div>
            </dl>
          )}

          {selected.onFailure && (
            <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <span className="font-medium">{FAILURE_LABEL[selected.onFailure.behaviour]}.</span>{' '}
              {selected.onFailure.detail}
            </p>
          )}
        </div>
      )}

      <ol className="mt-8 md:hidden">
        {active.nodes.map((node, i) => (
          <Node key={node.id} node={node} index={i} showFailures={showFailures} />
        ))}
      </ol>

      <p className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Steps are marked by kind. Deterministic rules can be audited and explained; model calls
        handle input no rulebook would finish describing. Deciding which is which is most of the
        work, and getting it wrong is why automations get switched off.
      </p>
      </div>
    </div>
    </>
  );
}
