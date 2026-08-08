/**
 * automation-graph.test.ts
 *
 * React Flow itself is not worth testing — it is a maintained library. What is
 * worth pinning is the translation from flow data into a graph: that every step
 * becomes a node, that the edges follow the order the steps are written in, and
 * that nothing is draggable, since these are diagrams of systems that already
 * exist rather than an editor.
 */

import { describe, it, expect } from 'vitest';

import { toGraph } from '../automation-graph';
import { AUTOMATION_FLOWS } from '@/lib/automation-flows';

const FLOW = AUTOMATION_FLOWS[0];

describe('happy path', () => {
  it('renders one node per step', () => {
    expect(toGraph(FLOW).nodes).toHaveLength(FLOW.nodes.length);
  });

  it('chains the steps in the order they are written', () => {
    const { edges } = toGraph(FLOW);

    expect(edges).toHaveLength(FLOW.nodes.length - 1);
    expect(edges[0]).toMatchObject({ source: FLOW.nodes[0].id, target: FLOW.nodes[1].id });
  });

  it('carries each step and its index into the node data', () => {
    const [first] = toGraph(FLOW).nodes;

    expect(first.data).toMatchObject({ step: FLOW.nodes[0], index: 0 });
  });
});

describe('the canvas is a diagram, not an editor', () => {
  it('makes every node undraggable', () => {
    // Letting someone rearrange these would imply the layout carries meaning
    // it does not.
    for (const node of toGraph(FLOW).nodes) {
      expect(node.draggable).toBe(false);
    }
  });
});

describe('layout', () => {
  it('uses an authored position when one is given', () => {
    const flow = {
      ...FLOW,
      nodes: [{ ...FLOW.nodes[0], position: { x: 999, y: 42 } }],
    };

    expect(toGraph(flow).nodes[0].position).toEqual({ x: 999, y: 42 });
  });

  it('falls back to a left-to-right layout when none is given', () => {
    const { nodes } = toGraph(FLOW);

    // Strictly increasing x, so an unpositioned flow is still readable.
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i].position.x).toBeGreaterThan(nodes[i - 1].position.x);
    }
  });

  it('follows an explicit next when a step branches', () => {
    const flow = {
      ...FLOW,
      nodes: [
        { ...FLOW.nodes[0], next: [FLOW.nodes[2].id] },
        FLOW.nodes[1],
        FLOW.nodes[2],
      ],
    };

    const edges = toGraph(flow).edges;
    expect(edges.some(e => e.source === FLOW.nodes[0].id && e.target === FLOW.nodes[2].id)).toBe(true);
  });

  it('leaves the last step without an outgoing edge', () => {
    const { edges } = toGraph(FLOW);
    const last = FLOW.nodes[FLOW.nodes.length - 1].id;

    expect(edges.some(e => e.source === last)).toBe(false);
  });
});

describe('every flow can be laid out', () => {
  it('produces a connected graph for each one', () => {
    for (const flow of AUTOMATION_FLOWS) {
      const { nodes, edges } = toGraph(flow);

      expect(nodes.length, flow.id).toBeGreaterThan(2);
      // No orphan edges: every endpoint must be a real node.
      const ids = new Set(nodes.map(n => n.id));
      for (const edge of edges) {
        expect(ids.has(edge.source), `${flow.id}:${edge.source}`).toBe(true);
        expect(ids.has(edge.target), `${flow.id}:${edge.target}`).toBe(true);
      }
    }
  });

  it('gives every step a unique id within its flow', () => {
    for (const flow of AUTOMATION_FLOWS) {
      const ids = flow.nodes.map(n => n.id);
      expect(new Set(ids).size, flow.id).toBe(ids.length);
    }
  });
});
