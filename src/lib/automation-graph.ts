import type { AutomationFlow } from '@/lib/automation-flows';

/**
 * Turns a flow into canvas nodes and edges.
 *
 * Deliberately separate from AutomationCanvas: that component imports React
 * Flow's stylesheet, which drags PostCSS into anything that imports it. Pure
 * layout logic has no business needing a CSS pipeline to be tested.
 */

export interface GraphNode {
  id: string;
  type: 'step';
  position: { x: number; y: number };
  data: Record<string, unknown>;
  draggable: false;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

/** Column spacing when a flow has no authored positions. */
const COLUMN = 280;

export function toGraph(flow: AutomationFlow): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = flow.nodes.map((step, i) => ({
    id: step.id,
    type: 'step',
    // Authored position wins; otherwise lay out left to right with a slight
    // stagger so long labels do not collide.
    position: step.position ?? { x: i * COLUMN, y: (i % 2) * 40 },
    data: { step, index: i } as unknown as Record<string, unknown>,
    draggable: false,
  }));

  const edges: GraphEdge[] = flow.nodes.flatMap((step, i) => {
    const targets = step.next ?? (flow.nodes[i + 1] ? [flow.nodes[i + 1].id] : []);
    return targets.map(target => ({ id: `${step.id}->${target}`, source: step.id, target }));
  });

  return { nodes, edges };
}
