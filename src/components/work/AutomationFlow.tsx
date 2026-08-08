'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';

import {
  AUTOMATION_FLOWS,
  NODE_KIND_LABEL,
  type FlowNode,
  type NodeKind,
} from '@/lib/automation-flows';
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

const KIND_STYLES: Record<NodeKind, string> = {
  io: 'border-l-gray-400 dark:border-l-gray-500',
  rule: 'border-l-emerald-500 dark:border-l-emerald-400',
  model: 'border-l-violet-500 dark:border-l-violet-400',
  human: 'border-l-amber-500 dark:border-l-amber-400',
};

const KIND_BADGE: Record<NodeKind, string> = {
  io: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  rule: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  model: 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  human: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
};

function Node({ node, index }: { node: FlowNode; index: number }) {
  const [open, setOpen] = React.useState(false);
  const detailId = `${node.id}-detail`;

  return (
    <li className={`border-l-2 pl-4 ${KIND_STYLES[node.kind]}`}>
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
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${KIND_BADGE[node.kind]}`}>
              {NODE_KIND_LABEL[node.kind]}
            </span>
          </span>
          <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
            {node.input} → {node.output}
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
  const active = AUTOMATION_FLOWS.find(f => f.id === activeId) ?? AUTOMATION_FLOWS[0];

  return (
    <>
      <DemoIntro {...AUTOMATION_INTRO} />

      <div className="p-6">
      <div role="tablist" aria-label="Automation flows" className="flex flex-wrap gap-2">
        {AUTOMATION_FLOWS.map(flow => (
          <button
            key={flow.id}
            role="tab"
            aria-selected={flow.id === activeId}
            onClick={() => {
              setActiveId(flow.id);
              setSelected(null);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              flow.id === activeId
                ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            {flow.title}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
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

      {/* Desktop: the canvas. Mobile: the list, because a pannable graph on a
          360px screen is unusable and the list already reads well. */}
      <div className="mt-8 hidden overflow-hidden rounded-lg border border-gray-200 md:block dark:border-gray-700">
        <AutomationCanvas flow={active} onSelect={setSelected} />
      </div>

      {selected && (
        <div className="mt-4 hidden rounded-lg border border-gray-200 p-4 md:block dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {selected.label}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${KIND_BADGE[selected.kind]}`}>
              {NODE_KIND_LABEL[selected.kind]}
            </span>
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {selected.detail}
          </p>
        </div>
      )}

      <ol className="mt-8 md:hidden">
        {active.nodes.map((node, i) => (
          <Node key={node.id} node={node} index={i} />
        ))}
      </ol>

      <p className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Steps are marked by kind. Deterministic rules can be audited and explained; model calls
        handle input no rulebook would finish describing. Deciding which is which is most of the
        work, and getting it wrong is why automations get switched off.
      </p>
    </div>
    </>
  );
}
