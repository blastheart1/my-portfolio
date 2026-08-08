'use client';

import * as React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  NODE_KIND_LABEL,
  type AutomationFlow,
  type FlowNode,
  type NodeKind,
} from '@/lib/automation-flows';
import { toGraph } from '@/lib/automation-graph';

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

type StepData = { step: FlowNode; index: number };

function StepNode({ data }: NodeProps) {
  const { step, index } = data as unknown as StepData;

  return (
    <div
      // Uniform. The kind is carried by the badge below, in words — colour was
      // never the accessible signal, so removing it loses nothing and the
      // canvas reads far calmer with twelve flows in it.
      className="w-56 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm
                 dark:border-gray-700 dark:bg-gray-900"
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
        {step.input} → {step.output}
      </p>

      <Handle type="source" position={Position.Right} className="!bg-gray-300 dark:!bg-gray-600" />
    </div>
  );
}

const nodeTypes = { step: StepNode };

export default function AutomationCanvas({
  flow,
  onSelect,
}: {
  flow: AutomationFlow;
  onSelect: (step: FlowNode) => void;
}) {
  const { nodes, edges } = React.useMemo(() => toGraph(flow), [flow]);

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
      </ReactFlow>
    </div>
  );
}
