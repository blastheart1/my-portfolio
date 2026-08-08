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
const ALLOWED = ['QuickBooks', 'Bill.com'];

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
  'Klaviyo',
  'Asana',
  'BroadVoice',
  'MSSQL',
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

    await user.click(screen.getByRole('button', { name: new RegExp(AUTOMATION_FLOWS[1].title) }));

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


describe('the expanded catalogue', () => {
  it('offers at least ten workflows', () => {
    expect(AUTOMATION_FLOWS.length).toBeGreaterThanOrEqual(10);
  });

  it('names QuickBooks and Bill.com, which are published work', () => {
    // The site already advertises "QuickBooks and Bill.com integration", so
    // these two are deliberately not sanitized away.
    const prose = allProse();
    for (const vendor of ALLOWED) {
      expect(prose).toContain(vendor);
    }
  });

  it('still hides every other vendor and the client', () => {
    const prose = allProse().toLowerCase();
    for (const name of MUST_NOT_APPEAR) {
      expect(prose, name).not.toContain(name.toLowerCase());
    }
  });

  it('gives every flow a problem, an outcome, and enough steps to be a flow', () => {
    for (const flow of AUTOMATION_FLOWS) {
      expect(flow.problem.length, flow.id).toBeGreaterThan(40);
      expect(flow.outcome.length, flow.id).toBeGreaterThan(40);
      expect(flow.nodes.length, flow.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps money-touching steps deterministic across every flow', () => {
    // A model may suggest, summarise or classify. It must not be the step that
    // creates an invoice, posts a credit, or marks something paid.
    const writes = /invoice|credit|payment|bill|paid/i;
    for (const flow of AUTOMATION_FLOWS) {
      for (const node of flow.nodes) {
        if (node.kind === 'model' && writes.test(node.label)) {
          throw new Error(`${flow.id}: "${node.label}" is a model call touching money`);
        }
      }
    }
  });

  it('gives every flow a unique id and title', () => {
    const ids = AUTOMATION_FLOWS.map(f => f.id);
    const titles = AUTOMATION_FLOWS.map(f => f.title);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(titles).size).toBe(titles.length);
  });
});


describe('the flow selector is a uniform list', () => {
  it('offers no pill tablist', () => {
    render(<AutomationFlowExplorer />);

    // Twelve titles of differing length wrapped into an uneven tag cloud.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('lists every flow as a row', () => {
    render(<AutomationFlowExplorer />);

    for (const flow of AUTOMATION_FLOWS) {
      expect(screen.getByRole('button', { name: new RegExp(flow.title) })).toBeInTheDocument();
    }
  });

  it('marks the active row rather than restyling it alone', () => {
    render(<AutomationFlowExplorer />);

    const active = screen.getByRole('button', { name: new RegExp(AUTOMATION_FLOWS[0].title) });
    expect(active).toHaveAttribute('aria-current', 'true');
  });

  it('offers a native select below md, where a sidebar does not fit', () => {
    render(<AutomationFlowExplorer />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(AUTOMATION_FLOWS.length);
  });
});

describe('nodes carry no colour-only meaning', () => {
  it('uses one neutral badge treatment for every kind', () => {
    const { container } = render(<AutomationFlowExplorer />);

    // Colour was never the accessible signal — the kind label is — so the
    // per-kind palette only added noise across twelve flows.
    expect(container.innerHTML).not.toMatch(/emerald|violet|amber-/);
  });

  it('still states each kind in words', () => {
    render(<AutomationFlowExplorer />);

    for (const node of AUTOMATION_FLOWS[0].nodes) {
      const row = screen.getByRole('button', { name: new RegExp(node.label) });
      expect(within(row).getByText(NODE_KIND_LABEL[node.kind])).toBeInTheDocument();
    }
  });
});
