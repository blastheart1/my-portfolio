'use client';

import * as React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  NODE_KIND_LABEL,
  FAILURE_LABEL,
  type AutomationFlow,
  type FlowNode,
} from '@/lib/automation-flows';
import { toGraph } from '@/lib/automation-graph';
import type { NodeRunState } from '@/lib/automation-runner';

/**
 * The automation canvas.
 *
 * Static by design: pan, zoom and inspect, but nothing is draggable and nothing
 * persists. These are diagrams of systems that already exist, not an editor —
 * letting someone rearrange them would imply the layout means something it
 * does not.
 *
 * The kind of each node is the substance. Rules can be audited and explained;
 * model calls handle input no rulebook would finish describing. Seeing the two
 * separated on a canvas is what makes that claim concrete.
 */

/** One neutral treatment; the words carry the meaning. */
const KIND_BADGE = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

type StepData = {
  step: FlowNode;
  index: number;
  /** Currently executing in run mode. */
  isActive: boolean;
  runState: NodeRunState;
  showFailures: boolean;
};

/**
 * Glow by outcome, not by step type.
 *
 * green   ran and succeeded
 * amber   a decision point — the run chose a path here
 * red     the step that broke in this scenario
 *
 * Every one of these is also stated in text on the node, because colour alone
 * would put the entire meaning of run mode out of reach for anyone who cannot
 * distinguish the hues — and red/green is the worst possible pair for that.
 */
const RUN_STYLE: Record<NodeRunState, string> = {
  done: 'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)] dark:border-emerald-400',
  choice: 'border-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.20)] dark:border-amber-400',
  failed: 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.22)] dark:border-red-400',
  pending: 'border-gray-200 dark:border-gray-700',
  untaken: 'border-gray-200 dark:border-gray-700',
};

const RUN_LABEL: Partial<Record<NodeRunState, string>> = {
  done: 'Done',
  choice: 'Chose a path',
  failed: 'Failed here',
  untaken: 'Not taken',
};

function StepNode({ data }: NodeProps) {
  const { step, index, isActive, runState, showFailures } = data as unknown as StepData;
  const runLabel = RUN_LABEL[runState];

  return (
    <div
      // Uniform. The kind is carried by the badge below, in words — colour was
      // never the accessible signal, so removing it loses nothing and the
      // canvas reads far calmer with a dozen flows in it.
      //
      // Run state is the one thing that does change the frame: the active step
      // gets a ring, and steps the sample record never reaches fade. Both also
      // read out in text, so neither is carried by appearance alone.
      className={`w-56 rounded-lg border bg-white p-3 text-left transition-all
                  dark:bg-gray-900 ${RUN_STYLE[runState]}
                  ${isActive ? 'ring-2 ring-gray-900/15 dark:ring-gray-100/20' : ''}
                  ${runState === 'untaken' ? 'opacity-35' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-300 dark:!bg-gray-600" />

      <div className="flex items-center gap-2">
        <span className="text-[10px] tabular-nums text-gray-400">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.label}</span>
      </div>

      {/* The kind is always spelled out, never carried by the accent colour
          alone — this has to survive greyscale and colour blindness. */}
      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] ${KIND_BADGE}`}>
        {NODE_KIND_LABEL[step.kind]}
      </span>

      <p className="mt-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        {showFailures && step.onFailure
          ? `${FAILURE_LABEL[step.onFailure.behaviour]} — ${step.onFailure.detail}`
          : `${step.input} → ${step.output}`}
      </p>

      {runLabel && (
        // In text as well as colour: red and green alone is the worst possible
        // pair to carry meaning with.
        <span
          className={`mt-2 block text-[10px] font-medium ${
            runState === 'failed'
              ? 'text-red-600 dark:text-red-400'
              : runState === 'choice'
                ? 'text-amber-600 dark:text-amber-400'
                : runState === 'done'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400'
          }`}
        >
          {isActive ? `${runLabel} — running` : runLabel}
        </span>
      )}

      <Handle type="source" position={Position.Right} className="!bg-gray-300 dark:!bg-gray-600" />
    </div>
  );
}

const nodeTypes = { step: StepNode };

interface CanvasProps {
  flow: AutomationFlow;
  onSelect: (step: FlowNode) => void;
  activeNodeId?: string | null;
  runStates?: Map<string, NodeRunState>;
  showFailures?: boolean;
}

/**
 * Keeps the running step in view.
 *
 * Without this the run continues off-screen on the wider flows and the visitor
 * is left panning to find it, which defeats the point of watching it at all.
 * Inside the provider because setCenter needs the flow instance.
 */
function FollowActiveNode({
  activeNodeId,
  flow,
}: {
  activeNodeId?: string | null;
  flow: AutomationFlow;
}) {
  const { setCenter, getZoom } = useReactFlow();

  React.useEffect(() => {
    if (!activeNodeId) return;
    const node = flow.nodes.find(n => n.id === activeNodeId);
    if (!node?.position) return;

    // Centre on the node's middle rather than its origin, or a wide node sits
    // half off the edge. 224 x 120 is the rendered card.
    setCenter(node.position.x + 112, node.position.y + 60, {
      zoom: Math.max(getZoom(), 0.8),
      duration: 500,
    });
  }, [activeNodeId, flow, setCenter, getZoom]);

  return null;
}

function Canvas({
  flow,
  onSelect,
  activeNodeId,
  runStates,
  showFailures = false,
}: CanvasProps) {
  const base = React.useMemo(() => toGraph(flow), [flow]);

  // Run state is merged into node data rather than held inside React Flow, so
  // the graph itself stays a pure function of the flow.
  const nodes = React.useMemo(
    () =>
      base.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === activeNodeId,
          runState: runStates?.get(node.id) ?? 'pending',
          showFailures,
        },
      })),
    [base.nodes, activeNodeId, runStates, showFailures]
  );
  const edges = base.edges;

  return (
    <div className="h-[520px] w-full" data-testid="automation-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: false }}
        onNodeClick={(_, node) => onSelect((node.data as unknown as StepData).step)}
      >
        <Background gap={16} className="!bg-gray-50 dark:!bg-gray-950" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!hidden md:!block" />
        <FollowActiveNode activeNodeId={activeNodeId} flow={flow} />
      </ReactFlow>
    </div>
  );
}

/** useReactFlow needs a provider above it, so the export wraps the canvas. */
export default function AutomationCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
