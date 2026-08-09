/**
 * automation-runner.test.ts
 *
 * Run mode walks a sample record through a flow. Nothing executes — the path
 * is authored — so the risk is not a crash but a diagram that quietly claims
 * something untrue: a decision drawn as a fan-out, a path that never ends, or
 * a branch whose sample route was never specified and silently defaulted.
 */

import { describe, it, expect } from 'vitest';

import { runOrder, nextFor, untakenNodes, terminals, nodeStates } from '../automation-runner';
import { AUTOMATION_FLOWS, type AutomationFlow } from '../automation-flows';

const byId = (id: string) => AUTOMATION_FLOWS.find(f => f.id === id)!;
const branching = AUTOMATION_FLOWS.filter(f =>
  f.nodes.some(n => (n.next?.length ?? 0) > 1 && !n.fanOut)
);

describe('happy path', () => {
  it('starts at the trigger', () => {
    for (const flow of AUTOMATION_FLOWS) {
      expect(runOrder(flow)[0], flow.id).toBe(flow.nodes[0].id);
    }
  });

  it('visits a linear flow in order', () => {
    const linear = AUTOMATION_FLOWS.find(f => f.nodes.every(n => (n.next?.length ?? 0) <= 1))!;

    expect(runOrder(linear)).toEqual(linear.nodes.map(n => n.id));
  });

  it('visits every node exactly once, even where branches reconverge', () => {
    for (const flow of AUTOMATION_FLOWS) {
      const order = runOrder(flow);
      expect(new Set(order).size, flow.id).toBe(order.length);
    }
  });

  it('terminates on every flow', () => {
    for (const flow of AUTOMATION_FLOWS) {
      const order = runOrder(flow);
      // An unterminated walk would hang the UI rather than fail loudly.
      expect(order.length, flow.id).toBeGreaterThan(0);
      expect(terminals(flow).some(t => order.includes(t)), `${flow.id} never reaches an end`).toBe(true);
    }
  });
});

describe('a decision picks one path', () => {
  it('follows sampleTakes rather than every target', () => {
    for (const flow of branching) {
      for (const node of flow.nodes) {
        if ((node.next?.length ?? 0) <= 1 || node.fanOut) continue;
        expect(nextFor(flow, node), `${flow.id}:${node.id}`).toEqual([node.sampleTakes]);
      }
    }
  });

  it('leaves the untaken paths out of the run', () => {
    const flow = branching[0];

    expect(untakenNodes(flow).size).toBeGreaterThan(0);
  });

  it('names a real node as the taken path', () => {
    for (const flow of AUTOMATION_FLOWS) {
      for (const node of flow.nodes) {
        if (!node.sampleTakes) continue;
        expect(
          flow.nodes.some(n => n.id === node.sampleTakes),
          `${flow.id}:${node.id} -> ${node.sampleTakes}`
        ).toBe(true);
      }
    }
  });

  it('requires sampleTakes on every decision branch', () => {
    // Without it the runner would take the first target and invent a decision
    // the data never made.
    for (const flow of AUTOMATION_FLOWS) {
      for (const node of flow.nodes) {
        if ((node.next?.length ?? 0) > 1 && !node.fanOut) {
          expect(node.sampleTakes, `${flow.id}:${node.id}`).toBeDefined();
        }
      }
    }
  });
});

describe('a fan-out runs every path', () => {
  it('follows all targets where fanOut is set', () => {
    const flow = byId('lead-intake');
    const gate = flow.nodes.find(n => n.id === 'gate')!;

    // Three writes that all happen, not a choice between them.
    expect(nextFor(flow, gate)).toEqual(gate.next);
  });

  it('leaves nothing untaken in a flow whose only split is a fan-out', () => {
    const flow = byId('partner-onboarding');

    expect(untakenNodes(flow).size).toBe(0);
  });
});

describe('malformed input does not hang', () => {
  it('survives a next pointing at a node that does not exist', () => {
    const broken: AutomationFlow = {
      ...byId('credit-sync'),
      nodes: [{ ...byId('credit-sync').nodes[0], next: ['nowhere'] }],
    };

    expect(runOrder(broken)).toEqual([broken.nodes[0].id]);
  });

  it('survives a cycle rather than looping forever', () => {
    const a = { ...byId('credit-sync').nodes[0], id: 'a', next: ['b'] };
    const b = { ...byId('credit-sync').nodes[1], id: 'b', next: ['a'] };

    expect(runOrder({ ...byId('credit-sync'), nodes: [a, b] })).toEqual(['a', 'b']);
  });

  it('returns nothing for a flow with no nodes', () => {
    expect(runOrder({ ...byId('credit-sync'), nodes: [] })).toEqual([]);
  });
});

describe('scenarios route and stop the run', () => {
  it('follows the scenario’s branch choices over the default', () => {
    const flow = byId('lead-intake');
    const nobody = flow.scenarios!.find(s => s.id === 'nobody')!;

    const order = runOrder(flow, nobody);

    expect(order).toContain('notify-queue');
    expect(order).not.toContain('notify-owner');
  });

  it('stops at the failing step, so nothing downstream looks like it ran', () => {
    const flow = byId('lead-intake');
    const down = flow.scenarios!.find(s => s.id === 'crm-down')!;

    const order = runOrder(flow, down);

    expect(order).toContain('crm');
    // The lead never went live; showing the terminal node reached would be a
    // lie about what happened.
    expect(order).not.toContain('done');
  });

  it('marks the failing node failed and the rest of the path done', () => {
    const flow = byId('qbo-to-billcom');
    const mismatch = flow.scenarios!.find(s => s.id === 'mismatch')!;
    const order = runOrder(flow, mismatch);

    const states = nodeStates(flow, order.length - 1, mismatch);

    expect(states.get('reconcile')).toBe('failed');
    expect(states.get('fetch')).toBe('done');
    expect(states.get('push')).toBe('untaken');
  });

  it('marks a decision node as a choice rather than merely done', () => {
    const flow = byId('lead-intake');
    const order = runOrder(flow, flow.scenarios![0]);

    const states = nodeStates(flow, order.length - 1, flow.scenarios![0]);

    expect(states.get('source-branch')).toBe('choice');
    expect(states.get('normalise')).toBe('done');
  });

  it('colours nothing before the run starts', () => {
    const flow = byId('lead-intake');

    const states = nodeStates(flow, -1, flow.scenarios![0]);

    // A diagram at rest must not imply an outcome.
    expect([...states.values()].every(v => v === 'pending')).toBe(true);
  });

  it('leaves steps ahead of the cursor pending', () => {
    const flow = byId('credit-sync');
    const order = runOrder(flow, flow.scenarios![0]);

    const states = nodeStates(flow, 1, flow.scenarios![0]);

    expect(states.get(order[0])).not.toBe('pending');
    expect(states.get(order[order.length - 1])).toBe('pending');
  });

  it('terminates for every scenario of every flow', () => {
    for (const flow of AUTOMATION_FLOWS) {
      for (const scenario of flow.scenarios ?? []) {
        const order = runOrder(flow, scenario);
        expect(order.length, `${flow.id}:${scenario.id}`).toBeGreaterThan(0);
        expect(new Set(order).size, `${flow.id}:${scenario.id}`).toBe(order.length);
      }
    }
  });
})
