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

// A flow with no branches, for the plain sequential cases. Picked by shape
// rather than by index: AUTOMATION_FLOWS[0] used to be linear and is now the
// most heavily branched one, which silently broke these assertions.
const FLOW = AUTOMATION_FLOWS.find(f => f.nodes.every(n => (n.next?.length ?? 0) <= 1))!;

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
    // Strip the authored positions to exercise the fallback.
    const bare = { ...FLOW, nodes: FLOW.nodes.map(({ position: _drop, ...rest }) => rest) };

    const { nodes } = toGraph(bare);

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

describe('branching flows', () => {
  const branching = AUTOMATION_FLOWS.filter(f => f.nodes.some(n => (n.next?.length ?? 0) > 1));

  it('at least four flows genuinely branch', () => {
    // The real export says 50 of 118 active zaps branch. A catalogue of
    // straight lines would misrepresent the work as simpler than it is.
    expect(branching.length).toBeGreaterThanOrEqual(4);
  });

  it('emits one edge per declared target', () => {
    for (const flow of branching) {
      const { edges } = toGraph(flow);
      for (const node of flow.nodes) {
        if (!node.next) continue;
        const out = edges.filter(e => e.source === node.id);
        expect(out.map(e => e.target).sort(), `${flow.id}:${node.id}`).toEqual(
          [...node.next].sort()
        );
      }
    }
  });

  it('never duplicates a node where paths reconverge', () => {
    for (const flow of branching) {
      const ids = toGraph(flow).nodes.map(n => n.id);
      expect(new Set(ids).size, flow.id).toBe(ids.length);
    }
  });

  it('reaches every node from the trigger', () => {
    for (const flow of AUTOMATION_FLOWS) {
      const { edges } = toGraph(flow);
      const seen = new Set([flow.nodes[0].id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const edge of edges) {
          if (seen.has(edge.source) && !seen.has(edge.target)) {
            seen.add(edge.target);
            grew = true;
          }
        }
      }
      // An orphaned node is a diagram that says something the system does not.
      expect(seen.size, `${flow.id}: unreachable nodes`).toBe(flow.nodes.length);
    }
  });

  it('lets no branch path dead-end', () => {
    for (const flow of branching) {
      const { edges } = toGraph(flow);
      const terminals = flow.nodes.filter(n => !edges.some(e => e.source === n.id));
      // Exactly one place a path can end. More than one means a branch was
      // drawn and then abandoned.
      expect(terminals.length, `${flow.id}: ${terminals.map(t => t.id).join(', ')}`).toBe(1);
    }
  });

  it('gives branch paths distinct lanes so they do not overlap', () => {
    for (const flow of branching) {
      for (const node of flow.nodes) {
        if ((node.next?.length ?? 0) < 2) continue;
        const lanes = node.next!.map(id => flow.nodes.find(n => n.id === id)?.position?.y);
        expect(new Set(lanes).size, `${flow.id}:${node.id}`).toBe(lanes.length);
      }
    }
  });
});

describe('the catalogue is not a set of toy diagrams', () => {
  it('averages well above five steps', () => {
    const avg = AUTOMATION_FLOWS.reduce((n, f) => n + f.nodes.length, 0) / AUTOMATION_FLOWS.length;
    expect(avg).toBeGreaterThan(6);
  });

  it('has at least one flow past a dozen steps', () => {
    expect(Math.max(...AUTOMATION_FLOWS.map(f => f.nodes.length))).toBeGreaterThanOrEqual(12);
  });
});
