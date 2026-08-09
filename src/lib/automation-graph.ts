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

/** Portrait needs more vertical room per step than landscape needs horizontal. */
const PORTRAIT_SCALE = 1.35;

export type Orientation = 'landscape' | 'portrait';

/**
 * Positions are authored left-to-right. Portrait transposes them — a column
 * becomes a row — so the same data lays out down a phone screen instead of
 * across it, and a branch fans sideways rather than stacking.
 */
export function toGraph(
  flow: AutomationFlow,
  orientation: Orientation = 'landscape'
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = flow.nodes.map((step, i) => {
    const authored = step.position ?? { x: i * COLUMN, y: (i % 2) * 40 };
    const position =
      orientation === 'portrait'
        ? { x: authored.y * 1.6, y: authored.x * PORTRAIT_SCALE }
        : authored;

    return {
      id: step.id,
      type: 'step',
      position,
      data: { step, index: i } as unknown as Record<string, unknown>,
      draggable: false,
    };
  });

  const edges: GraphEdge[] = flow.nodes.flatMap((step, i) => {
    const targets = step.next ?? (flow.nodes[i + 1] ? [flow.nodes[i + 1].id] : []);
    return targets.map(target => ({ id: `${step.id}->${target}`, source: step.id, target }));
  });

  return { nodes, edges };
}
