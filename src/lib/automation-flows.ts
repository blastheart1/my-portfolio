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
  /**
   * Grid position on the canvas. Authored rather than auto-laid-out: these are
   * hand-drawn diagrams of a dozen nodes, and dagre or elk would be a second
   * dependency to compute coordinates I can simply write. Column-major, so a
   * branch is a second row rather than a re-layout.
   */
  position?: { x: number; y: number };
  /** Ids this node feeds. Defaults to the next node in the array. */
  next?: string[];
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
  {
    id: 'estimate-to-invoice',
    title: 'Signed estimate to invoice',
    problem:
      'A signed estimate sat in the CRM until somebody noticed and keyed the same numbers into QuickBooks. Invoices went out days late, and the two systems disagreed about what had been billed.',
    outcome:
      'Signing raises the invoice within seconds, with a payment link attached and both systems agreeing on the amount.',
    nodes: [
      {
        id: 'signed',
        label: 'Estimate signed',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Signature event from the CRM',
        output: 'Estimate id and totals',
        detail:
          'A webhook rather than a poll. Polling for signatures means either a delay or a lot of empty requests, and this is the moment a customer is most ready to pay.',
      },
      {
        id: 'validate',
        label: 'Validate the estimate',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Estimate totals and line items',
        output: 'Approved, or held with a reason',
        detail:
          'Totals reconcile, the customer exists, nothing is negative. Cheap arithmetic that catches the errors an invoice would otherwise carry to the customer.',
      },
      {
        id: 'invoice',
        label: 'Create the QuickBooks invoice',
        kind: 'io',
        position: { x: 560, y: 0 },
        input: 'Validated estimate',
        output: 'Invoice in QuickBooks',
        detail:
          'Idempotent on the estimate id. A retried webhook must not raise a second invoice for the same job — that is the failure customers actually notice.',
      },
      {
        id: 'payment',
        label: 'Enable card payment',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Invoice id',
        output: 'Invoice with a payment link',
        detail:
          'Separate step because it fails independently. An invoice without a link is inconvenient; a missing invoice is a lost month.',
      },
      {
        id: 'confirm',
        label: 'Write the invoice back to the CRM',
        kind: 'io',
        position: { x: 1120, y: 0 },
        input: 'Invoice number and link',
        output: 'CRM record updated',
        detail:
          'Closes the loop so the salesperson sees the invoice where they already work, rather than being told to check another system.',
      },
    ],
  },
  {
    id: 'qbo-to-billcom',
    title: 'Invoice sync: QuickBooks to Bill.com',
    problem:
      'Invoices raised in QuickBooks had to be recreated in Bill.com for approval and payment. Two people, two keyboards, and a reconciliation every month to find what had drifted.',
    outcome:
      'An invoice raised in QuickBooks appears in Bill.com within a minute, with line items intact and a record of what was sent.',
    nodes: [
      {
        id: 'qbo',
        label: 'Invoice created in QuickBooks',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Invoice webhook',
        output: 'Invoice payload',
        detail:
          'The trigger. Everything downstream keys off the invoice id, so a duplicate webhook is detectable rather than a second bill.',
      },
      {
        id: 'shape',
        label: 'Map and validate line items',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'QuickBooks line items',
        output: 'Bill.com payload, or a rejection',
        detail:
          'The two systems disagree about what a line item is: different rounding, different tax handling, different required fields. This mapping is deterministic and versioned, because a silent mismatch here is money.',
      },
      {
        id: 'idempotent',
        label: 'Deduplicate on invoice id',
        kind: 'rule',
        position: { x: 560, y: 0 },
        input: 'Candidate payload',
        output: 'First-time payloads only',
        detail:
          'Retries are normal. Without this, every retry is a duplicate bill and someone spends an afternoon on credit notes.',
      },
      {
        id: 'push',
        label: 'Create in Bill.com',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Validated payload',
        output: 'Bill.com invoice',
        detail:
          'The write. Failures are retried with backoff rather than dropped, since a lost invoice is discovered at month end when it is expensive.',
      },
      {
        id: 'audit',
        label: 'Log the exchange',
        kind: 'io',
        position: { x: 1120, y: 0 },
        input: 'Request and response',
        output: 'Durable audit record',
        detail:
          'Both sides of every call are kept. When the two systems disagree later, this is the only thing that settles it.',
      },
    ],
  },
  {
    id: 'billcom-to-qbo',
    title: 'Bill sync: Bill.com to QuickBooks',
    problem:
      'Bills approved in Bill.com were re-entered into QuickBooks by hand, so the books lagged approvals by days and the two never quite matched.',
    outcome:
      'An approved bill lands in QuickBooks coded to the right account, without anyone retyping it.',
    nodes: [
      {
        id: 'approved',
        label: 'Bill approved in Bill.com',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Approval event',
        output: 'Bill payload',
        detail:
          'Approval rather than creation is the trigger. Syncing unapproved bills would put things in the books that nobody agreed to pay.',
      },
      {
        id: 'vendor',
        label: 'Match the vendor',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Vendor name and identifiers',
        output: 'Matched vendor, or held for review',
        detail:
          'Fuzzy name matching with a confidence floor. Below it the bill is held rather than guessed at — a bill posted against the wrong vendor is harder to unpick than one that waited.',
      },
      {
        id: 'code',
        label: 'Apply account coding',
        kind: 'rule',
        position: { x: 560, y: 0 },
        input: 'Bill and vendor history',
        output: 'Coded bill',
        detail:
          'Rules from prior coding for that vendor. Deterministic on purpose: an accountant has to be able to explain why a cost landed where it did.',
      },
      {
        id: 'create',
        label: 'Create the bill in QuickBooks',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Coded bill',
        output: 'QuickBooks bill',
        detail:
          'Idempotent on the Bill.com id, for the same reason as the other direction.',
      },
      {
        id: 'reconcile',
        label: 'Flag anything unmatched',
        kind: 'rule',
        position: { x: 1120, y: 0 },
        input: 'Sync result',
        output: 'Exception list',
        detail:
          'What could not be matched is surfaced as a short list rather than silently skipped. Silent skips are how a month closes short.',
      },
    ],
  },
  {
    id: 'credit-memo-sync',
    title: 'Credit memos and vendor credits',
    problem:
      'Credits were the exception nobody automated, so they were entered by hand in whichever system someone remembered, and the two drifted apart in the direction that flatters the books.',
    outcome:
      'Credits move in both directions on the same rails as invoices, with the same audit trail.',
    nodes: [
      {
        id: 'trigger',
        label: 'Credit raised in either system',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Credit memo or vendor credit event',
        output: 'Normalised credit',
        detail:
          'One handler for both directions. Credits are rare enough that two separate integrations would each rot from disuse.',
      },
      {
        id: 'link',
        label: 'Link to the original document',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Credit and its reference',
        output: 'Credit bound to an invoice or bill',
        detail:
          'A credit with nothing to offset is an error, not a transaction. It is held rather than posted.',
      },
      {
        id: 'sign',
        label: 'Check the sign and amount',
        kind: 'rule',
        position: { x: 560, y: 0 },
        input: 'Linked credit',
        output: 'Validated credit',
        detail:
          'A credit larger than what it offsets, or the wrong way round, is caught here. This is arithmetic, and arithmetic is exactly what should not be delegated to a model.',
      },
      {
        id: 'post',
        label: 'Post to the other system',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Validated credit',
        output: 'Credit in QuickBooks or Bill.com',
        detail:
          'Same idempotency and retry behaviour as the invoice path, because the failure modes are identical.',
      },
    ],
  },
  {
    id: 'payment-verification',
    title: 'Payment verification back to the CRM',
    problem:
      'Payment landed in the accounting system and nowhere else, so the team scheduling the work had no idea whether a deposit had cleared.',
    outcome:
      'A cleared payment updates the job record within minutes, and the schedulers stop asking accounts.',
    nodes: [
      {
        id: 'paid',
        label: 'Payment recorded',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Payment event from the accounting system',
        output: 'Payment amount and invoice reference',
        detail:
          'Triggered on cleared funds, not on a payment being initiated. The difference matters when a card is declined.',
      },
      {
        id: 'match',
        label: 'Match to the job',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Invoice reference',
        output: 'Job record',
        detail:
          'Deterministic lookup through the invoice, not by customer name. Two jobs for one customer is the normal case, not the edge case.',
      },
      {
        id: 'threshold',
        label: 'Check against what is owed',
        kind: 'rule',
        position: { x: 560, y: 0 },
        input: 'Payment and balance',
        output: 'Paid, part-paid, or overpaid',
        detail:
          'Partial payments are the common case and each means something different downstream. A model would have to be told the same arithmetic anyway.',
      },
      {
        id: 'update',
        label: 'Update the job status',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Payment status',
        output: 'CRM record and notification',
        detail:
          'Only after the funds clear. Marking a job paid on an intent is how work starts on money that never arrives.',
      },
    ],
  },
  {
    id: 'customer-lifecycle',
    title: 'Customer lifecycle: archive, revive, cold',
    problem:
      'Dead leads stayed in the active list forever, so the pipeline was inflated and the team worked through records nobody expected to convert.',
    outcome:
      'The list reflects reality: inactive records move out on their own and come straight back when the customer returns.',
    nodes: [
      {
        id: 'activity',
        label: 'Activity signals',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Contact, quote and appointment history',
        output: 'Per-record activity summary',
        detail:
          'Read from where the activity already lives rather than asking anyone to maintain a status field by hand.',
      },
      {
        id: 'rules',
        label: 'Apply the lifecycle rules',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Activity summary',
        output: 'Active, cold, or archived',
        detail:
          'Thresholds in a table. When someone asks why a record went cold, the answer is a number they can see and change — not a prompt.',
      },
      {
        id: 'archive',
        label: 'Archive and tidy up',
        kind: 'io',
        position: { x: 560, y: 0 },
        input: 'Archived records',
        output: 'Updated CRM, mailing lists and folders',
        detail:
          'Every system that knows about the customer is updated together, or the record comes back to life somewhere nobody was looking.',
      },
      {
        id: 'revive',
        label: 'Return on contact',
        kind: 'rule',
        position: { x: 840, y: 40 },
        input: 'Any new inbound activity',
        output: 'Reactivated record',
        detail:
          'The path back is automatic and immediate. An archive a customer cannot escape by getting in touch is just a way to lose them twice.',
      },
    ],
  },
  {
    id: 'document-provisioning',
    title: 'Document folder provisioning',
    problem:
      'Every new job needed a folder structure created by hand, so half were missing, misnamed, or in the wrong place, and photos ended up in personal drives.',
    outcome:
      'A consistent folder tree exists before anyone needs it, named the same way every time.',
    nodes: [
      {
        id: 'created',
        label: 'Job created',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'New job record',
        output: 'Job id and customer details',
        detail:
          'Runs at creation rather than on first upload. A folder that appears only when someone remembers to look is one people work around.',
      },
      {
        id: 'name',
        label: 'Build the naming convention',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Customer and job details',
        output: 'Canonical folder name',
        detail:
          'Deterministic and stable, so a name never changes under someone who bookmarked it. Renaming folders after the fact is how links rot.',
      },
      {
        id: 'create',
        label: 'Create the folder tree',
        kind: 'io',
        position: { x: 560, y: 0 },
        input: 'Folder name',
        output: 'Folders with permissions set',
        detail:
          'Permissions applied at creation. A folder that is created open and tightened later is open for exactly as long as nobody checks.',
      },
      {
        id: 'link',
        label: 'Attach the link to the record',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Folder link',
        output: 'CRM record updated',
        detail:
          'So nobody has to search for it, which is the step where people give up and use their own drive instead.',
      },
    ],
  },
  {
    id: 'ticket-sync',
    title: 'Cross-tool ticket sync',
    problem:
      'Two teams tracked the same work in two different tools. Status was copied between them by whoever noticed, which meant it was usually wrong in at least one place.',
    outcome:
      'A ticket in either tool stays in step with its twin, without either team changing how they work.',
    nodes: [
      {
        id: 'change',
        label: 'Ticket changes in either tool',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Create or update event',
        output: 'Normalised change',
        detail:
          'Bidirectional from the start. A one-way sync just moves the argument about which system is authoritative.',
      },
      {
        id: 'loop',
        label: 'Suppress echoes',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Change with its origin',
        output: 'Genuine changes only',
        detail:
          'Without this, each system reacts to the other forever. This is the single most important rule in a bidirectional sync and the one most often missing.',
      },
      {
        id: 'map',
        label: 'Map fields and status',
        kind: 'rule',
        position: { x: 560, y: 0 },
        input: 'Source ticket',
        output: 'Target-shaped ticket',
        detail:
          'The two tools have different status vocabularies. The mapping is explicit and reviewable, because a wrong status is worse than a missing one.',
      },
      {
        id: 'apply',
        label: 'Apply to the other tool',
        kind: 'io',
        position: { x: 840, y: 40 },
        input: 'Mapped ticket',
        output: 'Updated ticket',
        detail:
          'Idempotent, so a replayed event changes nothing.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications and escalation',
    problem:
      'Alerts went to a shared inbox that everyone had muted, so genuinely urgent things waited alongside routine noise.',
    outcome:
      'Routine updates stay quiet, and the few things that need a person now reach one.',
    nodes: [
      {
        id: 'event',
        label: 'Operational event',
        kind: 'io',
        position: { x: 0, y: 0 },
        input: 'Events from every connected system',
        output: 'Normalised event',
        detail:
          'One pipeline rather than each system having its own opinion about what deserves an alert.',
      },
      {
        id: 'severity',
        label: 'Classify severity',
        kind: 'rule',
        position: { x: 280, y: 40 },
        input: 'Event and its context',
        output: 'Routine, important, or urgent',
        detail:
          'Explicit thresholds. This decides whether someone gets woken up, which is exactly the kind of decision that must be inspectable.',
      },
      {
        id: 'summarise',
        label: 'Summarise the batch',
        kind: 'model',
        position: { x: 560, y: 0 },
        input: 'A window of routine events',
        output: 'One readable digest',
        detail:
          'The model summarises the quiet majority. It never decides what is urgent — it only writes up what the rules already sorted.',
      },
      {
        id: 'route',
        label: 'Send by channel',
        kind: 'rule',
        position: { x: 840, y: 40 },
        input: 'Classified event',
        output: 'Digest, chat message, or SMS',
        detail:
          'Channel follows severity, so the loud channel stays rare enough that people still react to it.',
      },
      {
        id: 'escalate',
        label: 'Escalate if unacknowledged',
        kind: 'rule',
        position: { x: 1120, y: 0 },
        input: 'Unacknowledged urgent alert',
        output: 'Escalation to the next person',
        detail:
          'The step that makes the rest trustworthy. An alert nobody acknowledges is not an alert.',
      },
    ],
  },
];

export function findFlow(id: string): AutomationFlow | undefined {
  return AUTOMATION_FLOWS.find(flow => flow.id === id);
}
