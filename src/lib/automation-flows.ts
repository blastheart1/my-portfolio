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
    id: "lead-intake",
    title: "Lead intake and routing",
    problem: "Enquiries arrived from a dozen different forms and marketplaces, each with its own shape. Someone re-typed them into the CRM, and roughly a third arrived without enough information to tell where they came from.",
    outcome: "Enquiries land in the CRM already classified, deduplicated and attributed, with junk filtered before anyone sees it, and their paperwork filed before anyone asks for it.",
    nodes: [
      {
        id: "submission",
        label: "New submission",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Any connected form or marketplace",
        output: "Raw fields, inconsistent between sources",
        detail: "One handler for every source rather than one integration each. Adding a source becomes configuration instead of a new build, which is the difference between a dozen automations and one.",
      },
      {
        id: "geo",
        label: "Attribution lookup",
        kind: "io",
        position: {
          x: 300,
          y: 130,
        },
        input: "Submission missing campaign or region data",
        output: "Inferred region and traffic source",
        detail: "Only called when the fields are actually absent. Running it on every submission would triple the cost for information most of them already carry.",
      },
      {
        id: "source-branch",
        label: "Branch on source",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Enriched submission",
        output: "One of three paths",
        detail: "The first fork. Marketplace leads, paid campaign leads and direct enquiries need different handling from here — different owners, different response times, different paperwork.",
        next: ["path-marketplace", "path-campaign", "path-direct"],
      },
      {
        id: "path-marketplace",
        label: "Marketplace path",
        kind: "rule",
        position: {
          x: 900,
          y: 0,
        },
        input: "Marketplace submission",
        output: "Mapped to the marketplace’s own field names",
        detail: "Each marketplace names its fields differently and none of them match the CRM. The mapping is per-source and deterministic.",
        next: ["normalise"],
      },
      {
        id: "path-campaign",
        label: "Paid campaign path",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Campaign submission",
        output: "Campaign and ad group preserved",
        detail: "Attribution has to survive the whole pipeline, or the spend report at the end of the month is guesswork.",
        next: ["normalise"],
      },
      {
        id: "path-direct",
        label: "Direct enquiry path",
        kind: "rule",
        position: {
          x: 900,
          y: 260,
        },
        input: "Direct submission",
        output: "Marked as unattributed",
        detail: "Honest about not knowing rather than guessing a source, which would quietly corrupt every attribution report downstream.",
        next: ["normalise"],
      },
      {
        id: "normalise",
        label: "Normalise",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Fields from any path",
        output: "One canonical shape",
        detail: "Field mapping, phone and address formatting, name casing. Entirely deterministic: the same input must always produce the same record.",
      },
      {
        id: "dedupe",
        label: "Match against existing records",
        kind: "rule",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Canonical record",
        output: "New, or matched to an existing customer",
        detail: "Matching on phone and address rather than name. A returning customer filed as a new lead is how two people end up quoting the same job.",
      },
      {
        id: "classify",
        label: "Classify intent",
        kind: "model",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Free-text description of what the person wants",
        output: "Category and urgency",
        detail: "The one step that genuinely needs a model. People describe the same need a hundred ways, and the keyword rules this replaced needed a new exception almost weekly.",
      },
      {
        id: "gate",
        label: "Spam and validity gate",
        kind: "rule",
        position: {
          x: 2100,
          y: 130,
        },
        input: "Classified record",
        output: "Accepted, or dropped with a reason",
        detail: "Deliberately a rule, and deliberately before the CRM write. A model deciding what to discard is a model you cannot audit when a real customer goes missing, and \"the AI dropped it\" is not an answer anyone accepts.",
        next: ["crm", "sheet", "folders"],
      },
      {
        id: "crm",
        label: "Create the CRM record",
        kind: "io",
        position: {
          x: 2400,
          y: 0,
        },
        input: "Accepted record",
        output: "Customer and job in the CRM",
        detail: "The write everything else keys off. Idempotent on the submission id, so a retried webhook cannot create a second job.",
        next: ["assign-branch"],
      },
      {
        id: "sheet",
        label: "Append to the tracking sheet",
        kind: "io",
        position: {
          x: 2400,
          y: 130,
        },
        input: "Accepted record",
        output: "Row in the reporting sheet",
        detail: "Runs in parallel with the CRM write. The sheet is what the weekly review actually looks at, and it failing must not block the record itself.",
        next: ["assign-branch"],
      },
      {
        id: "folders",
        label: "Create the document folders",
        kind: "io",
        position: {
          x: 2400,
          y: 260,
        },
        input: "Accepted record",
        output: "Folder tree with permissions",
        detail: "Five folders created together, permissions applied at creation. A folder tree that appears only when someone remembers to make it is one people work around.",
        next: ["assign-branch"],
      },
      {
        id: "assign-branch",
        label: "Branch on assignment",
        kind: "rule",
        position: {
          x: 2700,
          y: 130,
        },
        input: "Record with category and region",
        output: "Owner, or the unassigned queue",
        detail: "Region and category decide the owner. When nothing matches it goes to a queue rather than to whoever is first alphabetically.",
        next: ["notify-owner", "notify-queue"],
      },
      {
        id: "notify-owner",
        label: "Notify the owner",
        kind: "io",
        position: {
          x: 3000,
          y: 0,
        },
        input: "Assigned record",
        output: "Email and task",
        detail: "Sent only on assignment. A notification everyone receives is a notification nobody reads.",
        next: ["done"],
      },
      {
        id: "notify-queue",
        label: "Flag as unassigned",
        kind: "io",
        position: {
          x: 3000,
          y: 260,
        },
        input: "Unassigned record",
        output: "Queue entry and daily digest",
        detail: "Unassigned leads surface as a short daily list. Silence here is how an enquiry sits for a week.",
        next: ["done"],
      },
      {
        id: "done",
        label: "Lead is live",
        kind: "io",
        position: {
          x: 3300,
          y: 130,
        },
        input: "Routed record",
        output: "Enquiry visible to the team",
        detail: "Terminal. Everything above has to have happened before anyone is told the lead exists.",
      },
    ],
  },
  {
    id: "qbo-to-billcom",
    title: "Invoice sync: QuickBooks to Bill.com",
    problem: "Invoices raised in QuickBooks had to be recreated in Bill.com for approval and payment. Two people, two keyboards, and a reconciliation every month to find what had drifted.",
    outcome: "An invoice raised in QuickBooks appears in Bill.com within a minute, line items intact, with a record of exactly what was sent.",
    nodes: [
      {
        id: "trigger",
        label: "Invoice created in QuickBooks",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Invoice webhook",
        output: "Invoice id",
        detail: "The trigger. Everything downstream keys off the invoice id, so a duplicate webhook is detectable rather than a second bill.",
      },
      {
        id: "fetch",
        label: "Fetch the full invoice",
        kind: "io",
        position: {
          x: 300,
          y: 130,
        },
        input: "Invoice id",
        output: "Invoice with line items and customer",
        detail: "The webhook carries an id, not the document. Fetching guarantees the current state rather than whatever the event happened to contain.",
      },
      {
        id: "idempotent",
        label: "Deduplicate on invoice id",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Fetched invoice",
        output: "First-time invoices only",
        detail: "Retries are normal and duplicates are expensive. Without this, every retry is a second bill and someone spends an afternoon on credit notes.",
      },
      {
        id: "type-branch",
        label: "Branch on document type",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Invoice",
        output: "One of two paths",
        detail: "Deposits and progress invoices carry different terms and different approval routes. Treating them the same is how a deposit ends up in a 30-day queue.",
        next: ["path-deposit", "path-progress"],
      },
      {
        id: "path-deposit",
        label: "Deposit terms",
        kind: "rule",
        position: {
          x: 1200,
          y: 0,
        },
        input: "Deposit invoice",
        output: "Immediate terms, single line",
        detail: "Deposits are due on receipt. Encoded as a rule so the terms are visible in a table rather than buried in a prompt.",
        next: ["map"],
      },
      {
        id: "path-progress",
        label: "Progress terms",
        kind: "rule",
        position: {
          x: 1200,
          y: 260,
        },
        input: "Progress invoice",
        output: "Net terms, itemised lines",
        detail: "Progress invoices bill against a schedule, so every line has to survive the mapping intact.",
        next: ["map"],
      },
      {
        id: "map",
        label: "Map line items",
        kind: "rule",
        position: {
          x: 1500,
          y: 130,
        },
        input: "QuickBooks line items",
        output: "Bill.com payload",
        detail: "The two systems disagree about what a line item is: different rounding, different tax handling, different required fields. This mapping is deterministic and versioned, because a silent mismatch here is money.",
      },
      {
        id: "validate",
        label: "Reconcile the totals",
        kind: "rule",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Mapped payload",
        output: "Balanced payload, or a halt",
        detail: "The mapped lines must sum to the source total. If they do not, nothing is sent — a bill that is wrong by a cent is worse than a bill that is late.",
      },
      {
        id: "attach",
        label: "Attach the source document",
        kind: "io",
        position: {
          x: 2100,
          y: 130,
        },
        input: "Invoice PDF",
        output: "Payload with attachment",
        detail: "Whoever approves the bill sees the original alongside it, rather than being asked to trust a transformation they cannot inspect.",
      },
      {
        id: "push",
        label: "Create in Bill.com",
        kind: "io",
        position: {
          x: 2400,
          y: 130,
        },
        input: "Validated payload",
        output: "Bill.com invoice",
        detail: "The write. Failures retry with backoff rather than dropping, since a lost invoice is discovered at month end when it is expensive.",
        next: ["result-branch"],
      },
      {
        id: "result-branch",
        label: "Branch on outcome",
        kind: "rule",
        position: {
          x: 2700,
          y: 130,
        },
        input: "Write result",
        output: "Success or failure path",
        detail: "",
        next: ["audit", "alert"],
      },
      {
        id: "audit",
        label: "Log the exchange",
        kind: "io",
        position: {
          x: 3000,
          y: 0,
        },
        input: "Request and response",
        output: "Durable audit record",
        detail: "Both sides of every call are kept. When the two systems disagree later, this is the only thing that settles it.",
        next: ["done"],
      },
      {
        id: "alert",
        label: "Alert on failure",
        kind: "io",
        position: {
          x: 3000,
          y: 260,
        },
        input: "Error and payload",
        output: "Notification with context",
        detail: "The alert carries the payload, so the person fixing it does not start by asking which invoice failed.",
        next: ["done"],
      },
      {
        id: "done",
        label: "In step",
        kind: "io",
        position: {
          x: 3300,
          y: 130,
        },
        input: "Either outcome",
        output: "Both systems agree, or someone knows they do not",
        detail: "Terminal. Silence is never an outcome here.",
      },
    ],
  },
  {
    id: "credit-sync",
    title: "Credit memos and vendor credits",
    problem: "Credits were the exception nobody automated, so they were entered by hand in whichever system someone remembered, and the two drifted apart in the direction that flatters the books.",
    outcome: "Credits move in both directions on the same rails as invoices, with the same audit trail and the same refusal to guess.",
    nodes: [
      {
        id: "trigger",
        label: "Credit raised",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Credit memo or vendor credit event",
        output: "Normalised credit",
        detail: "One handler for both directions. Credits are rare enough that two separate integrations would each rot from disuse.",
      },
      {
        id: "direction",
        label: "Branch on direction",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Credit and its origin",
        output: "Customer credit or vendor credit",
        detail: "The two directions touch different ledgers and different approval rules. This is the fork the manual process kept getting wrong.",
        next: ["customer", "vendor"],
      },
      {
        id: "customer",
        label: "Customer credit memo",
        kind: "rule",
        position: {
          x: 600,
          y: 0,
        },
        input: "Credit against an invoice",
        output: "Credit bound to a customer invoice",
        detail: "Reduces what a customer owes. Has to find the original invoice or it is not a credit, it is a mystery.",
        next: ["link"],
      },
      {
        id: "vendor",
        label: "Vendor credit",
        kind: "rule",
        position: {
          x: 600,
          y: 260,
        },
        input: "Credit against a bill",
        output: "Credit bound to a vendor bill",
        detail: "Reduces what is owed to a supplier, and posts to a different account. Same shape, different ledger.",
        next: ["link"],
      },
      {
        id: "link",
        label: "Link to the original document",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Credit and its reference",
        output: "Bound credit, or held",
        detail: "A credit with nothing to offset is an error, not a transaction. It is held for a person rather than posted somewhere plausible.",
      },
      {
        id: "sign",
        label: "Check sign and amount",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Bound credit",
        output: "Validated credit",
        detail: "A credit larger than what it offsets, or the wrong way round, is caught here. This is arithmetic, and arithmetic is exactly what should not be delegated to a model.",
      },
      {
        id: "post",
        label: "Post to the other system",
        kind: "io",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Validated credit",
        output: "Credit in the counterpart system",
        detail: "Same idempotency and retry behaviour as the invoice path, because the failure modes are identical.",
      },
      {
        id: "audit",
        label: "Record both sides",
        kind: "io",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Request and response",
        output: "Audit entry",
        detail: "Credits are what an auditor looks at first. The trail matters more here than anywhere else in the pipeline.",
      },
    ],
  },
  {
    id: "document-provisioning",
    title: "Document folder provisioning",
    problem: "Every new job needed a folder structure created by hand, so half were missing, misnamed, or in the wrong place, and photos ended up in personal drives.",
    outcome: "A consistent tree exists before anyone needs it, named the same way every time, with permissions already right.",
    nodes: [
      {
        id: "created",
        label: "Job created",
        kind: "io",
        position: {
          x: 0,
          y: 260,
        },
        input: "New job record",
        output: "Job id and customer details",
        detail: "Runs at creation rather than on first upload. A folder that appears only when someone remembers to look is one people work around.",
      },
      {
        id: "name",
        label: "Build the naming convention",
        kind: "rule",
        position: {
          x: 300,
          y: 260,
        },
        input: "Customer and job details",
        output: "Canonical folder name",
        detail: "Deterministic and stable, so a name never changes under someone who bookmarked it. Renaming folders after the fact is how links rot.",
      },
      {
        id: "root",
        label: "Find or create the root",
        kind: "io",
        position: {
          x: 600,
          y: 260,
        },
        input: "Folder name",
        output: "Root folder",
        detail: "Find-or-create rather than create. Re-running must not produce a second tree beside the first.",
        next: ["sub-contracts", "sub-photos", "sub-permits", "sub-design", "sub-invoices"],
      },
      {
        id: "sub-contracts",
        label: "Contracts",
        kind: "io",
        position: {
          x: 900,
          y: 0,
        },
        input: "Root folder",
        output: "Contracts subfolder",
        detail: "",
        next: ["permissions"],
      },
      {
        id: "sub-photos",
        label: "Site photos",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Root folder",
        output: "Photos subfolder",
        detail: "",
        next: ["permissions"],
      },
      {
        id: "sub-permits",
        label: "Permits",
        kind: "io",
        position: {
          x: 900,
          y: 260,
        },
        input: "Root folder",
        output: "Permits subfolder",
        detail: "",
        next: ["permissions"],
      },
      {
        id: "sub-design",
        label: "Design",
        kind: "io",
        position: {
          x: 900,
          y: 390,
        },
        input: "Root folder",
        output: "Design subfolder",
        detail: "",
        next: ["permissions"],
      },
      {
        id: "sub-invoices",
        label: "Invoices",
        kind: "io",
        position: {
          x: 900,
          y: 520,
        },
        input: "Root folder",
        output: "Invoices subfolder",
        detail: "The five run in parallel. Sequentially this took long enough that people started creating folders themselves while they waited.",
        next: ["permissions"],
      },
      {
        id: "permissions",
        label: "Apply permissions",
        kind: "rule",
        position: {
          x: 1200,
          y: 260,
        },
        input: "Created folders",
        output: "Folders with access set",
        detail: "Applied at creation, not afterwards. A folder created open and tightened later is open for exactly as long as nobody checks.",
      },
      {
        id: "verify",
        label: "Verify the tree",
        kind: "rule",
        position: {
          x: 1500,
          y: 260,
        },
        input: "Folder ids",
        output: "Complete, or a repair list",
        detail: "Confirms every folder exists before the link is published. A partly built tree that looks finished is worse than an obviously missing one.",
      },
      {
        id: "link",
        label: "Attach the link to the record",
        kind: "io",
        position: {
          x: 1800,
          y: 260,
        },
        input: "Verified tree",
        output: "CRM record updated",
        detail: "So nobody has to search for it, which is the step where people give up and use their own drive instead.",
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
