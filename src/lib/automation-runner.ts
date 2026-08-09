import type { AutomationFlow, FlowNode, FlowScenario } from '@/lib/automation-flows';

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

/**
 * How a node behaves in a given run, which is what the glow encodes.
 *
 *   done    ran and succeeded
 *   choice  a decision point — the run picked one path here
 *   failed  the step that breaks in this scenario; the run stops
 *   pending not reached yet
 *   untaken not on this run's path at all
 */
export type NodeRunState = 'done' | 'choice' | 'failed' | 'pending' | 'untaken';

/** The order run mode visits nodes, from the trigger to a terminal step. */
export function runOrder(flow: AutomationFlow, scenario?: FlowScenario): string[] {
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

    // A scenario that fails here stops the run: nothing downstream happened,
    // and showing it as reached would misrepresent the failure.
    if (scenario?.failsAt === id) break;

    queue.push(...nextFor(flow, node, scenario));
  }

  return order;
}

/** The targets the sample record actually reaches from this node. */
export function nextFor(
  flow: AutomationFlow,
  node: FlowNode,
  scenario?: FlowScenario
): string[] {
  const index = flow.nodes.findIndex(n => n.id === node.id);
  const declared = node.next ?? (flow.nodes[index + 1] ? [flow.nodes[index + 1].id] : []);

  if (declared.length <= 1 || node.fanOut) return declared;

  // A decision: one path only. Falling back to the first target would quietly
  // invent a decision the data never made, so an unset sampleTakes is an
  // authoring bug the tests catch rather than something to paper over here.
  // A scenario can route the same diagram differently, which is the whole
  // point of having several of them.
  const chosen = scenario?.takes?.[node.id] ?? node.sampleTakes;
  return chosen ? [chosen] : declared.slice(0, 1);
}

/** Nodes this run never reaches — dimmed rather than hidden. */
export function untakenNodes(flow: AutomationFlow, scenario?: FlowScenario): Set<string> {
  const taken = new Set(runOrder(flow, scenario));
  return new Set(flow.nodes.filter(node => !taken.has(node.id)).map(node => node.id));
}

/**
 * What each node is doing at a point in the run.
 *
 * `cursor` is the index into runOrder; -1 means the run has not started, in
 * which case nothing is coloured at all — a diagram at rest should not imply
 * an outcome.
 */
export function nodeStates(
  flow: AutomationFlow,
  cursor: number,
  scenario?: FlowScenario
): Map<string, NodeRunState> {
  const order = runOrder(flow, scenario);
  const reached = new Set(order);
  const states = new Map<string, NodeRunState>();

  for (const node of flow.nodes) {
    if (cursor < 0) {
      states.set(node.id, 'pending');
      continue;
    }
    if (!reached.has(node.id)) {
      states.set(node.id, 'untaken');
      continue;
    }

    const position = order.indexOf(node.id);
    if (position > cursor) {
      states.set(node.id, 'pending');
    } else if (scenario?.failsAt === node.id) {
      states.set(node.id, 'failed');
    } else if ((node.next?.length ?? 0) > 1 && !node.fanOut) {
      // A decision the run made, worth marking differently from a step that
      // merely succeeded.
      states.set(node.id, 'choice');
    } else {
      states.set(node.id, 'done');
    }
  }

  return states;
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
