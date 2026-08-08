/**
 * AutomationFlow.test.tsx
 *
 * These flows are generalised from work done for a real client. The shape is
 * mine to show; their name, their vendors and their numbers are not.
 *
 * The content scan below is the important test in this file. Copy gets edited
 * casually — a "make this more concrete" pass is exactly how a client name gets
 * reintroduced by someone who does not know it was deliberately removed.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AutomationFlowExplorer from '../AutomationFlow';
import { AUTOMATION_FLOWS, NODE_KIND_LABEL } from '@/lib/automation-flows';

/**
 * Names from the source material that must never reach the page. Vendors are
 * included even where the product is generic: it is the combination that
 * identifies the client.
 */
const MUST_NOT_APPEAR = [
  'Calimingo',
  'ProDBX',
  'DBX',
  'Fiend',
  'JotForm',
  'Yelp',
  'Foxterra',
  'BroadVoice',
  'OpenPhone',
  'Trello',
  'Zapier',
  'IPinfo',
  'PoolSight',
  'Bruntwork',
];

/** Every string a visitor could read, across all flows and expanded nodes. */
function allProse(): string {
  return AUTOMATION_FLOWS.flatMap(flow => [
    flow.title,
    flow.problem,
    flow.outcome,
    ...flow.nodes.flatMap(n => [n.label, n.input, n.output, n.detail]),
  ]).join(' ');
}

describe('sanitization', () => {
  it.each(MUST_NOT_APPEAR)('never mentions %s', name => {
    expect(allProse().toLowerCase()).not.toContain(name.toLowerCase());
  });

  it('quotes no volume or revenue figures', () => {
    // "a third arrived without attribution" is fine; "1,400 leads a month" is
    // the client's business data, not mine to publish.
    const figures = allProse().match(/\b\d[\d,]*\s*(leads?|calls?|projects?|clients?|per|\/)/gi);

    expect(figures ?? []).toEqual([]);
  });

  it('names no currency amounts', () => {
    expect(allProse()).not.toMatch(/[$£€]\s?\d/);
  });
});

describe('happy path', () => {
  it('shows the first flow with all of its steps', () => {
    render(<AutomationFlowExplorer />);

    const flow = AUTOMATION_FLOWS[0];
    for (const node of flow.nodes) {
      expect(screen.getByText(node.label)).toBeInTheDocument();
    }
  });

  it('switches flows when another tab is chosen', async () => {
    const user = userEvent.setup();
    render(<AutomationFlowExplorer />);

    await user.click(screen.getByRole('tab', { name: AUTOMATION_FLOWS[1].title }));

    expect(screen.getByText(AUTOMATION_FLOWS[1].nodes[0].label)).toBeInTheDocument();
    expect(screen.queryByText(AUTOMATION_FLOWS[0].nodes[0].label)).toBeNull();
  });

  it('reveals a step detail on click and hides it again', async () => {
    const user = userEvent.setup();
    render(<AutomationFlowExplorer />);
    const node = AUTOMATION_FLOWS[0].nodes[0];

    const toggle = screen.getByRole('button', { name: new RegExp(node.label) });
    expect(screen.queryByText(node.detail)).toBeNull();

    await user.click(toggle);
    expect(screen.getByText(node.detail)).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText(node.detail)).toBeNull();
  });
});

describe('rule and model steps are distinguishable', () => {
  it('labels every step with its kind in words, not colour alone', () => {
    render(<AutomationFlowExplorer />);

    for (const node of AUTOMATION_FLOWS[0].nodes) {
      const item = screen.getByRole('button', { name: new RegExp(node.label) });
      expect(within(item).getByText(NODE_KIND_LABEL[node.kind])).toBeInTheDocument();
    }
  });

  it('marks each expandable step for assistive tech', async () => {
    const user = userEvent.setup();
    render(<AutomationFlowExplorer />);

    const toggle = screen.getAllByRole('button', { expanded: false })[0];
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('the claim the flows are meant to demonstrate', () => {
  it('keeps every money-touching step out of a model’s hands', () => {
    const billing = AUTOMATION_FLOWS.find(f => f.id === 'progress-billing')!;
    const submit = billing.nodes.find(n => n.id === 'submit')!;
    const approve = billing.nodes.find(n => n.id === 'review')!;

    expect(submit.kind).not.toBe('model');
    expect(approve.kind).toBe('human');
    // Approval must come before submission, or the human step is decorative.
    expect(billing.nodes.indexOf(approve)).toBeLessThan(billing.nodes.indexOf(submit));
  });

  it('keeps the discard decision deterministic', () => {
    const intake = AUTOMATION_FLOWS.find(f => f.id === 'lead-intake')!;
    const gate = intake.nodes.find(n => n.id === 'gate')!;

    // A model deciding what to throw away is a model you cannot audit when a
    // real customer goes missing.
    expect(gate.kind).toBe('rule');
  });

  it('uses at least one of each kind, so the distinction is visible', () => {
    const kinds = new Set(AUTOMATION_FLOWS.flatMap(f => f.nodes.map(n => n.kind)));

    expect(kinds).toEqual(new Set(['io', 'rule', 'model', 'human']));
  });
});
