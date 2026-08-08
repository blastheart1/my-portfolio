/**
 * Automation flows.
 *
 * Generalised from workflows built for live businesses. The *shape* is the
 * asset and is mine to show; the vendor list, the client, and their volumes
 * are not, so nodes name categories ("Intake form", "CRM") rather than
 * products, and no figures appear anywhere.
 *
 * `kind` is the point of the whole thing. A step is either a deterministic
 * rule that can be audited and explained, or a model call that handles input
 * no rulebook could finish describing. Choosing wrongly between the two is why
 * most "add AI to it" projects get switched off six months later, and showing
 * the split makes that claim demonstrable instead of asserted.
 */

export type NodeKind = 'io' | 'rule' | 'model' | 'human';

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** What arrives at this step. */
  input: string;
  /** What leaves it. */
  output: string;
  /** Why the step is this kind rather than the other. */
  detail: string;
}

export interface AutomationFlow {
  id: string;
  title: string;
  problem: string;
  outcome: string;
  nodes: FlowNode[];
}

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  io: 'Integration',
  rule: 'Deterministic rule',
  model: 'Model call',
  human: 'Human decision',
};

export const AUTOMATION_FLOWS: AutomationFlow[] = [
  {
    id: 'lead-intake',
    title: 'Lead intake and routing',
    problem:
      'Enquiries arrived from a dozen different forms and marketplaces, each with its own shape. Someone re-typed them into the CRM, and roughly a third arrived without enough information to tell where they came from.',
    outcome:
      'Enquiries land in the CRM already classified, deduplicated and attributed, with junk filtered before anyone sees it. No re-typing.',
    nodes: [
      {
        id: 'intake',
        label: 'Intake form',
        kind: 'io',
        input: 'Submission from any connected form or marketplace',
        output: 'Raw fields, inconsistent between sources',
        detail:
          'One handler for every source rather than one integration each. Adding a source becomes configuration instead of a new build.',
      },
      {
        id: 'enrich',
        label: 'Attribution lookup',
        kind: 'io',
        input: 'Submission missing campaign or region data',
        output: 'Inferred region and traffic source',
        detail:
          'Only called when the fields are actually absent. Calling it on every submission would triple the cost for information most of them already carry.',
      },
      {
        id: 'normalise',
        label: 'Normalise and dedupe',
        kind: 'rule',
        input: 'Raw fields from any source',
        output: 'One canonical record',
        detail:
          'Field mapping, phone and address formatting, and matching against existing records. Entirely deterministic — the same input must always produce the same record, and every merge has to be explainable to whoever asks why two enquiries became one.',
      },
      {
        id: 'classify',
        label: 'Classify intent',
        kind: 'model',
        input: 'Free-text description of what the person wants',
        output: 'Category and urgency',
        detail:
          'The one step that genuinely needs a model. People describe the same need a hundred ways, and the keyword rules this replaced needed a new exception almost weekly.',
      },
      {
        id: 'gate',
        label: 'Spam and validity gate',
        kind: 'rule',
        input: 'Classified record',
        output: 'Accepted, or dropped with a reason',
        detail:
          'Deliberately a rule and deliberately before the CRM write. A model deciding what to discard is a model you cannot audit when a real customer goes missing, and "the AI dropped it" is not an answer anyone accepts.',
      },
      {
        id: 'route',
        label: 'CRM, sheet and folder',
        kind: 'io',
        input: 'Accepted record',
        output: 'CRM entry, tracking row, document folder',
        detail:
          'Written in one step so a partial failure cannot leave a lead in the CRM with nowhere to file its paperwork.',
      },
    ],
  },
  {
    id: 'missed-call',
    title: 'Missed-call handling',
    problem:
      'Calls outside business hours went to voicemail, and voicemail went unchecked for days. The caller had usually gone elsewhere by the time anyone listened.',
    outcome:
      'Every missed call produces a summary and a follow-up task within minutes, whatever time it came in.',
    nodes: [
      {
        id: 'ring',
        label: 'Unanswered call',
        kind: 'io',
        input: 'Inbound call, nobody available',
        output: 'Call handed to the assistant',
        detail:
          'The handoff is a rule on ring count and business hours, not a judgement call. Predictability matters more than cleverness when a customer is on the line.',
      },
      {
        id: 'answer',
        label: 'Assistant answers',
        kind: 'model',
        input: 'Live caller',
        output: 'Recorded conversation',
        detail:
          'Gathers the reason for the call and a callback number. Scoped narrowly: it never quotes a price or commits to a date, because a confident wrong answer is worse than voicemail.',
      },
      {
        id: 'summarise',
        label: 'Summarise',
        kind: 'model',
        input: 'Recording and transcript',
        output: 'Short summary and extracted details',
        detail:
          'Extraction rather than interpretation. Anything the caller did not actually say is left blank rather than guessed at.',
      },
      {
        id: 'urgency',
        label: 'Route by urgency',
        kind: 'rule',
        input: 'Summary and extracted fields',
        output: 'Queue and assignee',
        detail:
          'Thresholds on explicit fields, so routing can be changed by editing a table instead of a prompt, and anyone can see why a call went where it did.',
      },
      {
        id: 'task',
        label: 'Follow-up task',
        kind: 'io',
        input: 'Routed summary',
        output: 'Task with the recording attached',
        detail:
          'The recording travels with the task. A summary nobody can check against the source is a summary nobody trusts twice.',
      },
    ],
  },
  {
    id: 'progress-billing',
    title: 'Photo-based progress billing',
    problem:
      'Billing for partially finished work meant someone walking a site with a line-item list, estimating percentages by eye, then re-entering them at a desk.',
    outcome:
      'A draft billing schedule is ready before anyone sits down, and the reviewer adjusts rather than starts from nothing.',
    nodes: [
      {
        id: 'photos',
        label: 'Site photos',
        kind: 'io',
        input: 'Photos from the field, read-only',
        output: 'Images tied to a project',
        detail:
          'Read-only against the source board on purpose. An automation that can modify the field team’s own records is one bug away from being a serious problem.',
      },
      {
        id: 'assess',
        label: 'Assess completion',
        kind: 'model',
        input: 'Photos and the line-item schedule',
        output: 'Suggested percentage per line item',
        detail:
          'Suggested, never applied. The model is comparing images against a list, which it is good at, and estimating money, which nobody should let it finalise.',
      },
      {
        id: 'sanity',
        label: 'Sanity checks',
        kind: 'rule',
        input: 'Suggested percentages',
        output: 'Suggestions, with implausible ones flagged',
        detail:
          'Completion cannot go backwards, cannot exceed the contracted amount, cannot jump further than the schedule allows. Cheap arithmetic that catches the failures a reviewer is most likely to skim past.',
      },
      {
        id: 'review',
        label: 'Reviewer approves',
        kind: 'human',
        input: 'Flagged suggestions',
        output: 'Approved schedule',
        detail:
          'The step that makes the rest safe to run. Every number is editable, nothing submits itself, and approving is a deliberate action rather than a default.',
      },
      {
        id: 'submit',
        label: 'Submit billing',
        kind: 'io',
        input: 'Approved schedule',
        output: 'Invoice raised against the project',
        detail:
          'Only reachable after approval. There is no path from the model straight to an invoice.',
      },
    ],
  },
];

export function findFlow(id: string): AutomationFlow | undefined {
  return AUTOMATION_FLOWS.find(flow => flow.id === id);
}
