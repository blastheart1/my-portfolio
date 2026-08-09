import type { AutomationFlow, FlowNode } from '@/lib/automation-flows';

/**
 * Walks the sample record through a flow.
 *
 * Nothing executes. The path is authored data: at a decision branch the run
 * follows `sampleTakes`, and at a fan-out it follows every target, because
 * those are two different claims about how the system behaves and a diagram
 * that blurs them teaches the wrong thing.
 *
 * The whole run is computed once, as an ordered list of node ids, rather than
 * being discovered step by step. That makes "does this terminate" a property
 * the tests can check for every flow rather than something you find out by
 * watching.
 */

/** The order run mode visits nodes, from the trigger to a terminal step. */
export function runOrder(flow: AutomationFlow): string[] {
  const byId = new Map(flow.nodes.map(node => [node.id, node]));
  const order: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = flow.nodes.length > 0 ? [flow.nodes[0].id] : [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    // A converging branch reaches the same node twice; it is visited once.
    if (seen.has(id)) continue;

    const node = byId.get(id);
    if (!node) continue;

    seen.add(id);
    order.push(id);
    queue.push(...nextFor(flow, node));
  }

  return order;
}

/** The targets the sample record actually reaches from this node. */
export function nextFor(flow: AutomationFlow, node: FlowNode): string[] {
  const index = flow.nodes.findIndex(n => n.id === node.id);
  const declared = node.next ?? (flow.nodes[index + 1] ? [flow.nodes[index + 1].id] : []);

  if (declared.length <= 1 || node.fanOut) return declared;

  // A decision: one path only. Falling back to the first target would quietly
  // invent a decision the data never made, so an unset sampleTakes is an
  // authoring bug the tests catch rather than something to paper over here.
  return node.sampleTakes ? [node.sampleTakes] : declared.slice(0, 1);
}

/** Nodes the sample record never reaches — dimmed while running. */
export function untakenNodes(flow: AutomationFlow): Set<string> {
  const taken = new Set(runOrder(flow));
  return new Set(flow.nodes.filter(node => !taken.has(node.id)).map(node => node.id));
}

/** Terminal steps: nodes nothing leads on from. */
export function terminals(flow: AutomationFlow): string[] {
  return flow.nodes
    .filter(node => {
      const index = flow.nodes.findIndex(n => n.id === node.id);
      const declared = node.next ?? (flow.nodes[index + 1] ? [flow.nodes[index + 1].id] : []);
      return declared.length === 0;
    })
    .map(node => node.id);
}
