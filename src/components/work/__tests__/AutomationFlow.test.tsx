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
    flow.sampleRecord,
    ...flow.nodes.flatMap(n => [
      n.label,
      n.input,
      n.output,
      n.detail,
      n.sample?.in ?? '',
      n.sample?.out ?? '',
      n.onFailure?.detail ?? '',
    ]),
  ]).join(' ');
}

/**
 * First names lifted from the client's zap titles. The per-partner and
 * per-salesperson automations are named after real people, and those titles
 * are the most likely thing to leak while writing about "one design, eleven
 * instances".
 */
const REAL_PEOPLE = [
  'Aaron', 'Allison', 'Brad', 'Brian', 'Kraig', 'Madison', 'Terry', 'Tieg',
  'Andrew', 'Byanka', 'Sevan', 'Rigo', 'Szewczyk', 'Podergois', 'Nastazio',
];

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

  it('names no currency amounts in the descriptive copy', () => {
    // Scoped to prose rather than everything. The point is that the client's
    // real figures stay private; the invented amounts in sample payloads are
    // what make the inspector legible, and a rule that forbade those would be
    // protecting nothing.
    const prose = AUTOMATION_FLOWS.flatMap(flow => [
      flow.title,
      flow.problem,
      flow.outcome,
      ...flow.nodes.map(n => n.detail),
    ]).join(' ');

    expect(prose).not.toMatch(/[$£€]\s?\d/);
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
    // Was written against progress-billing, which described an automation that
    // was only ever proposed and has been removed. The claim is unchanged, so
    // it is asserted across the whole catalogue instead of one flow.
    const writes = /invoice|credit|payment|bill|paid|refund/i;

    for (const flow of AUTOMATION_FLOWS) {
      for (const node of flow.nodes) {
        if (writes.test(node.label)) {
          expect(node.kind, `${flow.id}:${node.label}`).not.toBe('model');
        }
      }
    }
  });

  it('puts a human before anything irreversible', () => {
    // Where a flow can pay, refund or undo a person's own action, a human step
    // has to come first or the safeguard is decorative.
    const guarded = ['credit-sync', 'folder-repair'];

    for (const id of guarded) {
      const flow = AUTOMATION_FLOWS.find(f => f.id === id)!;
      const holds = flow.nodes.filter(n => n.kind === 'human' || n.onFailure?.behaviour === 'hold');
      expect(holds.length, id).toBeGreaterThan(0);
    }
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

    // Named explicitly: there are two selects on the page now, the other being
    // the scenario picker.
    const select = screen.getByRole('combobox', { name: /workflow/i });
    expect(within(select).getAllByRole('option')).toHaveLength(AUTOMATION_FLOWS.length);
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


describe('only real, built automations', () => {
  it('describes nothing that was never built', () => {
    // Both were listed in the vault under "Target" and "Automation target" —
    // intentions, not implementations — and were removed. Unbuilt work beside
    // real work is indefensible the moment someone asks a follow-up question.
    const ids = AUTOMATION_FLOWS.map(f => f.id);

    expect(ids).not.toContain('missed-call');
    expect(ids).not.toContain('progress-billing');
  });

  it('names no real person from a zap title', () => {
    const prose = allProse();

    for (const name of REAL_PEOPLE) {
      expect(prose, name).not.toContain(name);
    }
  });

  it('keeps sample payloads synthetic', () => {
    const samples = AUTOMATION_FLOWS.flatMap(f =>
      f.nodes.flatMap(n => [n.sample?.in ?? '', n.sample?.out ?? ''])
    ).join(' ');

    // Invented customers and job numbers only — never anything lifted from the
    // client's own data.
    for (const name of [...MUST_NOT_APPEAR, ...REAL_PEOPLE]) {
      expect(samples.toLowerCase(), name).not.toContain(name.toLowerCase());
    }
  });

  it('gives every flow a sample record to run', () => {
    for (const flow of AUTOMATION_FLOWS) {
      expect(flow.sampleRecord?.length, flow.id).toBeGreaterThan(30);
    }
  });

  it('says what every step does when it breaks', () => {
    for (const flow of AUTOMATION_FLOWS) {
      for (const node of flow.nodes) {
        expect(node.onFailure, `${flow.id}:${node.id}`).toBeDefined();
      }
    }
  });
});


describe('scenarios', () => {
  it('offers the flow’s scenarios, happy path first', () => {
    render(<AutomationFlowExplorer />);

    const picker = screen.getByRole('combobox', { name: /scenario/i });
    const flow = AUTOMATION_FLOWS[0];
    expect(within(picker).getAllByRole('option')).toHaveLength(flow.scenarios!.length);
    expect((picker as HTMLSelectElement).value).toBe(flow.scenarios![0].id);
  });

  it('explains what makes the selected run different', async () => {
    const user = userEvent.setup();
    render(<AutomationFlowExplorer />);
    const flow = AUTOMATION_FLOWS[0];
    const edge = flow.scenarios![1];

    await user.selectOptions(screen.getByRole('combobox', { name: /scenario/i }), edge.id);

    expect(screen.getAllByText(edge.summary).length).toBeGreaterThan(0);
  });

  it('gives every flow a happy path and at least one edge case', () => {
    for (const flow of AUTOMATION_FLOWS) {
      // A diagram with only the happy path does not justify half its steps.
      expect(flow.scenarios?.length, flow.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('routes and fails only at nodes that exist', () => {
    for (const flow of AUTOMATION_FLOWS) {
      const ids = new Set(flow.nodes.map(n => n.id));
      for (const scenario of flow.scenarios ?? []) {
        if (scenario.failsAt) {
          expect(ids.has(scenario.failsAt), `${flow.id}:${scenario.id}`).toBe(true);
        }
        for (const [from, to] of Object.entries(scenario.takes ?? {})) {
          expect(ids.has(from), `${flow.id}:${scenario.id}:${from}`).toBe(true);
          expect(ids.has(to), `${flow.id}:${scenario.id}:${to}`).toBe(true);
        }
      }
    }
  });

  it('covers a failure somewhere in every flow that can fail', () => {
    // The error handling is half the design; a catalogue that only ever shows
    // success is the same omission as having no onFailure data at all.
    const withFailure = AUTOMATION_FLOWS.filter(f => f.scenarios?.some(s => s.failsAt));
    expect(withFailure.length).toBeGreaterThanOrEqual(10);
  });
});
