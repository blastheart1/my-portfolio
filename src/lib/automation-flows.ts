/**
 * Automation flows.
 *
 * Generalised from automations running in a live business. Every flow here maps
 * to an active zap in the client's export, or to a documented group of
 * near-identical ones. Two earlier entries described work that was only ever
 * proposed — the vault lists them under "Target" and "Automation target" — and
 * have been removed. A portfolio that mixes built and unbuilt work is one you
 * cannot defend the moment someone asks a follow-up question.
 *
 * The shape is mine to show; the client, their vendors and their volumes are
 * not. Nodes name categories rather than products, and the per-partner and
 * per-salesperson automations carry real people's names in their titles which
 * never appear here. QuickBooks and Bill.com are named because that
 * integration is already published work.
 *
 * `kind` is the point. A step is either a deterministic rule that can be
 * audited, or a model call handling input no rulebook would finish describing.
 * `onFailure` is the other half of the same argument: what a step does when it
 * breaks says more about a system than what it does when it works.
 *
 * Sample payloads are synthetic throughout — invented customers, invented job
 * numbers — and a test scans them to keep it that way.
 *
 * ORDER IS DELIBERATE and asserted by a test, because array order is exactly
 * the kind of thing that drifts when someone appends a flow. Highest value and
 * impact first:
 *
 *   1. Money in       — deciding, raising and collecting revenue
 *   2. Money moving   — between systems, where a mistake is a financial error
 *   3. Reliability    — the automations that keep the others working
 *   4. Growth         — one design deployed many times over
 *   5. Housekeeping   — useful, but nothing breaks today if it pauses
 *
 * Within a band, the more structurally interesting flow comes first: a visitor
 * who opens one thing should land on the one that best shows the work.
 */

/** The value bands the catalogue is ordered by. Exported so a test can pin it. */
export const FLOW_BANDS: Record<string, readonly string[]> = {
  'Money in': ['lead-intake', 'card-payment', 'build-contract', 'estimate-to-invoice', 'payment-verification'],
  'Money moving': ['qbo-to-billcom', 'billcom-to-qbo', 'credit-sync'],
  Reliability: ['folder-repair', 'document-provisioning'],
  Growth: ['partner-referral', 'partner-onboarding', 'salesperson-routing'],
  Housekeeping: ['customer-lifecycle', 'reporting-sync', 'notifications'],
};

export type NodeKind = 'io' | 'rule' | 'model' | 'human';

/** What a step does when it breaks. */
export type FailureBehaviour = 'retry' | 'alert' | 'halt' | 'hold';

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Authored grid position: x by column, y by lane, so a branch is rows. */
  position?: { x: number; y: number };
  /** Ids this node feeds. Defaults to the next node in the array. */
  next?: string[];
  /**
   * Which path the sample record follows at a decision branch.
   *
   * Required when `next` has several targets and `fanOut` is not set: a
   * decision picks one path, and run mode has to know which.
   */
  sampleTakes?: string;
  /**
   * Marks several targets as parallel rather than alternative — every path
   * runs. Without this, run mode would show a fan-out as a choice, which is a
   * different claim about how the system behaves.
   */
  fanOut?: true;
  input: string;
  output: string;
  detail: string;
  /** Synthetic before/after, shown in the inspector. Never client data. */
  sample?: { in: string; out: string };
  onFailure?: { behaviour: FailureBehaviour; detail: string };
}

/**
 * A specific run worth showing: the happy path, and the edge cases that
 * justify half the steps.
 *
 * `takes` overrides the branch choices for this scenario, so one diagram can
 * demonstrate several routes. `failsAt` marks the step that breaks — the run
 * stops there and the node's onFailure explains what happens next, which is
 * the only way to show the error handling without it being a claim in prose.
 */
export interface FlowScenario {
  id: string;
  label: string;
  /** One line on what makes this run different. */
  summary: string;
  /** nodeId -> the path taken, overriding sampleTakes. */
  takes?: Record<string, string>;
  /** The step that fails in this scenario. */
  failsAt?: string;
}

export interface AutomationFlow {
  id: string;
  title: string;
  problem: string;
  outcome: string;
  /** What run mode walks through the flow. */
  sampleRecord: string;
  /** For designs deployed many times over, e.g. one per partner. */
  instances?: { count: number; label: string };
  /**
   * Runs a visitor can choose between. The first is always the happy path;
   * the rest are the edge cases the flow was actually built for.
   */
  scenarios?: FlowScenario[];
  nodes: FlowNode[];
}

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  io: 'Integration',
  rule: 'Deterministic rule',
  model: 'Model call',
  human: 'Human decision',
};

export const FAILURE_LABEL: Record<FailureBehaviour, string> = {
  retry: 'Retries',
  alert: 'Alerts a person',
  halt: 'Stops the run',
  hold: 'Waits for approval',
};

export const AUTOMATION_FLOWS: AutomationFlow[] = [
  {
    id: "lead-intake",
    title: "Lead intake and routing",
    sampleRecord: "A quote request submitted at 21:40 on a Sunday, from a paid campaign, with no region field filled in.",
      scenarios: [
        {
          id: "happy",
          label: "Paid campaign lead",
          summary: "Complete details, clean attribution, an owner available in that region.",
          takes: { "source-branch": "path-campaign", "assign-branch": "notify-owner" },
        },
        {
          id: "unattributed",
          label: "No attribution at all",
          summary: "Someone typed the address in directly. The enrichment step cannot help, and the record is marked unattributed rather than guessed at.",
          takes: { "source-branch": "path-direct", "assign-branch": "notify-owner" },
        },
        {
          id: "nobody",
          label: "No owner for the region",
          summary: "A valid lead in a region nobody covers. It goes to the queue rather than to whoever is first alphabetically.",
          takes: { "source-branch": "path-marketplace", "assign-branch": "notify-queue" },
        },
        {
          id: "crm-down",
          label: "The CRM is unreachable",
          summary: "Everything upstream succeeded and the one write that matters fails. This is why it retries and then alerts with the payload rather than dropping.",
          takes: { "source-branch": "path-campaign" },
          failsAt: "crm",
        },
        {
          id: "spam",
          label: "Caught by the gate",
          summary: "An obvious junk submission. Dropped before any write, with the rule that caught it recorded — the reason this step is a rule and not a model.",
          takes: { "source-branch": "path-direct" },
          failsAt: "gate",
        },
      ],
    problem: "Enquiries arrived from a dozen forms and marketplaces, each with its own shape. Someone re-typed them into the CRM, and roughly a third arrived without enough information to tell where they came from.",
    outcome: "Enquiries land already classified, deduplicated and attributed, with junk filtered before anyone sees it and paperwork filed before anyone asks.",
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
        output: "Raw fields",
        detail: "One handler for every source rather than one integration each, so adding a source is configuration, not a build.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries with backoff; the form provider replays unacknowledged submissions, so a brief outage loses nothing.",
        },
        sample: {
          in: "{ name, email, phone, message }",
          out: "Raw submission, source tagged",
        },
      },
      {
        id: "geo",
        label: "Attribution lookup",
        kind: "io",
        position: {
          x: 300,
          y: 130,
        },
        input: "Submission missing region or campaign",
        output: "Inferred region and traffic source",
        detail: "Called only when the fields are absent. Running it on every submission would triple the cost for data most already carry.",
        onFailure: {
          behaviour: "alert",
          detail: "Continues without enrichment and flags the record as unattributed. A missing region is not worth losing a lead over.",
        },
        sample: {
          in: "{ ip, referrer }",
          out: "{ region: \"South West\", source: \"paid\" }",
        },
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
        detail: "The first fork. Marketplace, paid campaign and direct enquiries need different owners, response times and paperwork.",
        onFailure: {
          behaviour: "halt",
          detail: "Nothing to retry: if the source cannot be determined the record is held rather than sent down an arbitrary path.",
        },
        sample: {
          in: "{ source: \"paid\" }",
          out: "Takes the campaign path",
        },
        next: ["path-marketplace", "path-campaign", "path-direct"],
        sampleTakes: "path-campaign",
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
        output: "Mapped to that marketplace’s field names",
        detail: "Each marketplace names its fields differently and none match the CRM. The mapping is per-source and deterministic.",
        onFailure: {
          behaviour: "halt",
          detail: "Held for review; an unmapped field silently dropped is how a phone number goes missing.",
        },
        sample: {
          in: "Marketplace payload",
          out: "Canonical fields",
        },
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
        detail: "Attribution has to survive the whole pipeline or the month-end spend report is guesswork.",
        onFailure: {
          behaviour: "halt",
          detail: "Held rather than stripped. Losing attribution quietly corrupts every report downstream.",
        },
        sample: {
          in: "{ utm_campaign, utm_group }",
          out: "Attribution preserved on the record",
        },
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
        output: "Marked unattributed",
        detail: "Honest about not knowing rather than guessing a source.",
        onFailure: {
          behaviour: "halt",
          detail: "Held for review.",
        },
        sample: {
          in: "No campaign data",
          out: "Marked unattributed",
        },
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
        detail: "Field mapping, phone and address formatting, name casing. Deterministic: the same input must always produce the same record.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. A half-normalised record is worse than none, because everything downstream trusts this shape.",
        },
        sample: {
          in: "{ phone: \"(0117) 4960 123\" }",
          out: "{ phone: \"+441174960123\" }",
        },
      },
      {
        id: "dedupe",
        label: "Match existing records",
        kind: "rule",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Canonical record",
        output: "New, or matched to a customer",
        detail: "Matches on phone and address, not name. A returning customer filed as new is how two people quote the same job.",
        onFailure: {
          behaviour: "hold",
          detail: "Ambiguous matches wait for a person. Merging the wrong two customers is far harder to undo than leaving them apart.",
        },
        sample: {
          in: "{ phone, address }",
          out: "No match — new customer",
        },
      },
      {
        id: "classify",
        label: "Classify intent",
        kind: "model",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Free-text description",
        output: "Category and urgency",
        detail: "The one step that genuinely needs a model. People describe the same need a hundred ways, and the keyword rules this replaced needed a new exception weekly.",
        onFailure: {
          behaviour: "alert",
          detail: "Falls back to \"uncategorised\" and routes to the general queue. A wrong category is worse than none.",
        },
        sample: {
          in: "\"pool is green and the pump is making a noise\"",
          out: "{ category: \"service\", urgency: \"high\" }",
        },
      },
      {
        id: "gate",
      fanOut: true,
        label: "Spam and validity gate",
        kind: "rule",
        position: {
          x: 2100,
          y: 130,
        },
        input: "Classified record",
        output: "Accepted, or dropped with a reason",
        detail: "Deliberately a rule, and deliberately before the CRM write. A model deciding what to discard cannot be audited when a real customer goes missing.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops before any write. Every drop is logged with the rule that caused it.",
        },
        sample: {
          in: "Classified record",
          out: "Accepted",
        },
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
        output: "Customer and job",
        detail: "The write everything keys off. Idempotent on the submission id, so a retried webhook cannot create a second job.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; on exhaustion alerts with the payload, because this is the one write that cannot be silently lost.",
        },
        sample: {
          in: "Accepted record",
          out: "Job #A-4417",
        },
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
        output: "Reporting row",
        detail: "Runs beside the CRM write. The sheet is what the weekly review reads, and its failure must not block the record.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then gives up quietly. A missing reporting row is an inconvenience, not a lost lead.",
        },
        sample: {
          in: "Accepted record",
          out: "Row appended",
        },
        next: ["assign-branch"],
      },
      {
        id: "folders",
        label: "Create document folders",
        kind: "io",
        position: {
          x: 2400,
          y: 260,
        },
        input: "Accepted record",
        output: "Folder tree with permissions",
        detail: "Five folders created together, permissions applied at creation.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then hands off to the repair automation rather than blocking the lead.",
        },
        sample: {
          in: "Job #A-4417",
          out: "5 folders created",
        },
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
        detail: "Region and category decide the owner. When nothing matches it goes to a queue, not to whoever is first alphabetically.",
        onFailure: {
          behaviour: "halt",
          detail: "Defaults to the queue. Assigning to the wrong person is worse than assigning to nobody.",
        },
        sample: {
          in: "{ region, category }",
          out: "No owner for this region",
        },
        next: ["notify-owner", "notify-queue"],
        sampleTakes: "notify-queue",
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
        detail: "Sent only on assignment. A notification everyone receives is one nobody reads.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the task in the CRM is the durable record, the email is the nudge.",
        },
        sample: {
          in: "Owner id",
          out: "Email sent",
        },
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
        detail: "Unassigned leads surface as a short daily list. Silence is how an enquiry sits for a week.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts immediately. An unassigned lead nobody is told about is the failure this step exists to prevent.",
        },
        sample: {
          in: "Unassigned record",
          out: "Added to the daily digest",
        },
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
        output: "Visible to the team",
        detail: "Terminal. Everything above must have happened before anyone is told the lead exists.",
        onFailure: {
          behaviour: "alert",
          detail: "n/a — nothing follows.",
        },
        sample: {
          in: "Job #A-4417",
          out: "Live",
        },
      },
    ],
  },
  {
    id: "card-payment",
    title: "Card payment eligibility",
    sampleRecord: "A build invoice for £46,800 where the customer has asked to pay by card.",
    problem: "Card payment was either on for everything, which handed a percentage of every large invoice to the processor, or off for everything, which lost the small fast payments it was worth paying for. Deciding case by case meant someone judging each invoice by eye and telling three different people the answer.",
    outcome: "Eligibility is decided on the invoice itself, the fee is absorbed only where it pays for itself, and everyone who needs to know is told in the same pass.",
    scenarios: [
      {
        id: "happy",
        label: "A small invoice — card enabled",
        summary: "Under the threshold, standard terms. Card payment is switched on and the link goes out with the invoice.",
        takes: {
          kind: "k-design",
          threshold: "under",
          terms: "standard",
        },
      },
      {
        id: "large",
        label: "Over the fee threshold",
        summary: "The processing fee on a large invoice costs more than the days it saves, so card is withheld and bank details are sent instead. This is the decision the whole flow exists to make.",
        takes: {
          kind: "k-build",
          threshold: "over",
          terms: "staged",
        },
      },
      {
        id: "approved",
        label: "Large, but approved anyway",
        summary: "A customer who will only pay by card. The fee is accepted deliberately, by a person, and recorded against the invoice so it shows up in the margin.",
        takes: {
          kind: "k-build",
          threshold: "over",
          terms: "standard",
        },
      },
      {
        id: "deposit",
        label: "A deposit on staged terms",
        summary: "Staged invoices are treated separately: the deposit takes card to get work started, the balance does not.",
        takes: {
          kind: "k-service",
          threshold: "under",
          terms: "staged",
        },
      },
      {
        id: "qb-down",
        label: "The accounting system rejects the update",
        summary: "The eligibility decision was made and cannot be applied. It alerts rather than retrying silently, because an invoice sent with the wrong payment options is a customer-facing error.",
        takes: {
          kind: "k-design",
          threshold: "under",
          terms: "standard",
        },
        failsAt: "apply",
      },
      {
        id: "notify-fails",
        label: "The customer email fails",
        summary: "The invoice is correct and the customer was never told. This is the failure that looks like nothing went wrong.",
        takes: {
          kind: "k-design",
          threshold: "under",
          terms: "standard",
        },
        failsAt: "tell-customer",
      },
    ],
    nodes: [
      {
        id: "invoice",
        label: "Invoice raised",
        kind: "io",
        position: {
          x: 0,
          y: 195,
        },
        input: "Invoice created event",
        output: "Invoice with totals and terms",
        detail: "Runs after the invoice exists rather than during creation, so a failure here can never stop an invoice going out at all.",
        sample: {
          in: "Invoice #INV-9104",
          out: "£46,800, build, staged",
        },
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the invoice stands regardless of what this decides.",
        },
      },
      {
        id: "history",
        label: "Read payment history",
        kind: "io",
        position: {
          x: 300,
          y: 195,
        },
        input: "Customer id",
        output: "How they have paid before",
        detail: "The strongest signal available, and already in the system. Asking a model to infer it would be inventing an answer that is sitting in a table.",
        sample: {
          in: "Customer #C-3310",
          out: "2 prior invoices, both bank transfer",
        },
        onFailure: {
          behaviour: "alert",
          detail: "Continues with no history and treats them as new, which is the conservative default.",
        },
      },
      {
        id: "kind",
        label: "Branch on invoice type",
        kind: "rule",
        position: {
          x: 600,
          y: 195,
        },
        next: ["k-design", "k-build", "k-service"],
        sampleTakes: "k-build",
        input: "Invoice",
        output: "Design, build or service",
        detail: "Three product lines with genuinely different economics. A design invoice is small and fast; a build invoice is large and slow. Treating them alike is what made the old blanket setting wrong in both directions.",
        sample: {
          in: "type: build",
          out: "Build",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Holds the invoice as manual rather than guessing a type.",
        },
      },
      {
        id: "k-design",
        label: "Design invoice",
        kind: "rule",
        position: {
          x: 900,
          y: 0,
        },
        next: ["threshold"],
        input: "Design invoice",
        output: "Fast-payment profile",
        detail: "Small and frequent. Card almost always pays for itself here, because the days saved matter more than the percentage.",
        sample: {
          in: "£1,240",
          out: "Fast profile",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "k-build",
        label: "Build invoice",
        kind: "rule",
        position: {
          x: 900,
          y: 195,
        },
        next: ["threshold"],
        input: "Build invoice",
        output: "Fee-sensitive profile",
        detail: "Large and staged. This is where the processing percentage becomes a real number rather than a rounding error.",
        sample: {
          in: "£46,800",
          out: "Fee-sensitive profile",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "k-service",
        label: "Service invoice",
        kind: "rule",
        position: {
          x: 900,
          y: 390,
        },
        next: ["threshold"],
        input: "Service invoice",
        output: "Fast-payment profile",
        detail: "Small, often urgent, frequently paid on the spot. The case card payment exists for.",
        sample: {
          in: "£380",
          out: "Fast profile",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "threshold",
        label: "Branch on amount",
        kind: "rule",
        position: {
          x: 1200,
          y: 195,
        },
        next: ["under", "over"],
        sampleTakes: "over",
        input: "Total and profile",
        output: "Under or over the fee threshold",
        detail: "The core decision, and deliberately a rule. Card takes a percentage, so above a certain amount the fee costs more than the days it saves. That figure is a business decision living in a table someone can change without a deploy.",
        sample: {
          in: "£46,800 vs £5,000",
          out: "Over",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Stops and holds. Guessing wrong here costs real money on every invoice it touches.",
        },
      },
      {
        id: "under",
        label: "Under the threshold",
        kind: "rule",
        position: {
          x: 1500,
          y: 0,
        },
        next: ["fee"],
        input: "Small invoice",
        output: "Card eligible",
        detail: "Below the threshold the fee is worth paying. No approval needed; this is the common case and it should not require a person.",
        sample: {
          in: "£1,240",
          out: "Eligible",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "over",
        label: "Over the threshold",
        kind: "rule",
        position: {
          x: 1500,
          y: 390,
        },
        next: ["approval"],
        input: "Large invoice",
        output: "Needs a decision",
        detail: "Not an automatic refusal. Some customers will only pay by card, and the relationship is worth more than the fee.",
        sample: {
          in: "£46,800",
          out: "Escalated",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "approval",
        label: "Someone decides",
        kind: "human",
        position: {
          x: 1800,
          y: 390,
        },
        next: ["fee"],
        input: "Large invoice and history",
        output: "Approved or declined",
        detail: "A person absorbs the fee or does not. Deliberately not a rule, because the reason is usually about the relationship rather than the number, and that is not something a threshold can hold.",
        sample: {
          in: "£46,800, pays by transfer",
          out: "Declined",
        },
        onFailure: {
          behaviour: "hold",
          detail: "Waits. An undecided large invoice simply goes out without card, which is the safe outcome.",
        },
      },
      {
        id: "fee",
        label: "Calculate the fee",
        kind: "rule",
        position: {
          x: 2100,
          y: 195,
        },
        input: "Eligibility and total",
        output: "Fee, and who absorbs it",
        detail: "Arithmetic on the published rate. Recorded even when it is zero, so the margin sheet shows what card payment cost across the year rather than hiding it in processing.",
        sample: {
          in: "£46,800 at 1.4%",
          out: "£0 — card declined",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Stops. An unrecorded fee is a cost nobody sees until year end.",
        },
      },
      {
        id: "terms",
        label: "Branch on payment terms",
        kind: "rule",
        position: {
          x: 2400,
          y: 195,
        },
        next: ["standard", "staged"],
        sampleTakes: "staged",
        input: "Eligibility and terms",
        output: "Standard or staged",
        detail: "Staged invoices want different answers per stage: the deposit takes card to get work started, the balance does not. This is why it cannot be one flag on the customer record.",
        sample: {
          in: "Staged, 3 payments",
          out: "Staged",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Defaults to standard terms, which offer fewer options rather than more.",
        },
      },
      {
        id: "standard",
        label: "Standard terms",
        kind: "rule",
        position: {
          x: 2700,
          y: 0,
        },
        next: ["apply"],
        input: "Single invoice",
        output: "One option set",
        detail: "A single payment, a single decision.",
        sample: {
          in: "Single invoice",
          out: "Card on",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "staged",
        label: "Staged terms",
        kind: "rule",
        position: {
          x: 2700,
          y: 390,
        },
        next: ["apply"],
        input: "Deposit and balance",
        output: "Options per stage",
        detail: "The deposit and the balance genuinely want different answers.",
        sample: {
          in: "Deposit £4,680, balance £42,120",
          out: "Card on deposit only",
        },
        onFailure: {
          behaviour: "halt",
          detail: "Held.",
        },
      },
      {
        id: "apply",
        label: "Update the invoice",
        kind: "io",
        position: {
          x: 3000,
          y: 195,
        },
        input: "Option set",
        output: "Invoice updated",
        detail: "The write. Idempotent on the invoice id, so a retry cannot toggle the setting back and forth while someone is looking at it.",
        sample: {
          in: "Card on deposit",
          out: "Invoice updated",
        },
        onFailure: {
          behaviour: "alert",
          detail: "Alerts rather than retrying silently. An invoice sent with the wrong payment options is a customer-facing error, and a quiet retry loop hides it.",
        },
      },
      {
        id: "verify",
        label: "Read it back",
        kind: "rule",
        position: {
          x: 3300,
          y: 195,
        },
        next: ["tell-customer", "tell-sales", "tell-accounts", "log"],
        fanOut: true,
        input: "Updated invoice",
        output: "Confirmed, or a mismatch",
        detail: "Confirms the setting took rather than trusting the write. The accounting system accepts updates it does not always apply, which is exactly the failure a customer notices first.",
        sample: {
          in: "Expected: card on deposit",
          out: "Confirmed",
        },
        onFailure: {
          behaviour: "alert",
          detail: "Alerts with both values. A silent mismatch is the worst outcome available here.",
        },
      },
      {
        id: "tell-customer",
        label: "Email the customer",
        kind: "io",
        position: {
          x: 3600,
          y: 0,
        },
        next: ["done"],
        input: "Confirmed invoice",
        output: "Invoice with the right options",
        detail: "What the customer actually receives. Sent after verification so it can never describe options the invoice does not have.",
        sample: {
          in: "Invoice + link",
          out: "Email sent",
        },
        onFailure: {
          behaviour: "alert",
          detail: "Alerts. This is the failure that looks like nothing went wrong: the invoice is correct and nobody told them.",
        },
      },
      {
        id: "tell-sales",
        label: "Notify the salesperson",
        kind: "io",
        position: {
          x: 3600,
          y: 130,
        },
        next: ["done"],
        input: "Decision and reason",
        output: "Notification with the reason",
        detail: "They are who the customer will ask, so they get the reason rather than just the outcome.",
        sample: {
          in: "Declined — over threshold",
          out: "Salesperson notified",
        },
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the reason is also on the invoice record.",
        },
      },
      {
        id: "tell-accounts",
        label: "Notify accounts",
        kind: "io",
        position: {
          x: 3600,
          y: 260,
        },
        next: ["done"],
        input: "Fee decision",
        output: "Notification",
        detail: "Only when a fee is being absorbed. Routine decisions do not reach them, which is what keeps this channel worth reading.",
        sample: {
          in: "Fee absorbed: £0",
          out: "No notification needed",
        },
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
      },
      {
        id: "log",
        label: "Record against the margin",
        kind: "io",
        position: {
          x: 3600,
          y: 390,
        },
        next: ["done"],
        input: "Fee and decision",
        output: "Row on the margin sheet",
        detail: "A decision made once shows up later in the job margin rather than disappearing into processing costs.",
        sample: {
          in: "£0 absorbed",
          out: "Logged",
        },
        onFailure: {
          behaviour: "retry",
          detail: "Retries. A missing row understates the cost of the job.",
        },
      },
      {
        id: "done",
        label: "Invoice is payable",
        kind: "io",
        position: {
          x: 3900,
          y: 195,
        },
        input: "All notifications sent",
        output: "Customer can pay",
        detail: "Terminal.",
        sample: {
          in: "—",
          out: "Payable",
        },
        onFailure: {
          behaviour: "alert",
          detail: "Nothing follows.",
        },
      },
    ],
  },
  {
    id: "build-contract",
    title: "Signed contract to invoice",
    sampleRecord: "A signed build contract that includes structural engineering, so it takes the engineering-specific path.",
      scenarios: [
        {
          id: "happy",
          label: "Structural engineering",
          summary: "Takes the engineering schedule, which bills a design stage up front.",
          takes: { "type": "engineering" },
        },
        {
          id: "standard",
          label: "A standard pool",
          summary: "Four milestones, no design stage.",
          takes: { "type": "standard" },
        },
        {
          id: "materials",
          label: "Materials only",
          summary: "Deposit and balance, nothing else.",
          takes: { "type": "materials" },
        },
        {
          id: "replay",
          label: "A replayed signature event",
          summary: "Idempotency on the contract id stops a second invoice — the failure customers actually notice.",
          takes: { "type": "standard" },
          failsAt: "invoice",
        },
      ],
    problem: "A signed contract sat in the CRM until someone noticed and keyed the same numbers into QuickBooks, days later, differently each time.",
    outcome: "Signing raises the right invoice within seconds, against the right schedule for that contract type.",
    nodes: [
      {
        id: "signed",
        label: "Contract signed",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Signature event",
        output: "Contract id and totals",
        detail: "A webhook rather than a poll. This is the moment a customer is most ready to pay.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the CRM replays unacknowledged events.",
        },
        sample: {
          in: "Contract #B-3092",
          out: "Signed event",
        },
      },
      {
        id: "validate",
        label: "Validate the contract",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Totals and line items",
        output: "Approved, or held",
        detail: "Totals reconcile, the customer exists, nothing is negative. Cheap arithmetic that catches errors an invoice would carry to the customer.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops before any write.",
        },
        sample: {
          in: "Line items",
          out: "Totals reconcile",
        },
      },
      {
        id: "type",
        label: "Branch on document type",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Contract",
        output: "One of three schedules",
        detail: "Different engineering documents carry different payment schedules. Nine near-identical automations exist for this in production; the difference between them is only this branch.",
        onFailure: {
          behaviour: "halt",
          detail: "Held. Billing on the wrong schedule is a customer-facing error.",
        },
        sample: {
          in: "{ doc: \"structural\" }",
          out: "Engineering schedule",
        },
        next: ["standard", "engineering", "materials"],
        sampleTakes: "engineering",
      },
      {
        id: "standard",
        label: "Standard pool schedule",
        kind: "rule",
        position: {
          x: 900,
          y: 0,
        },
        input: "Standard contract",
        output: "Milestone schedule",
        detail: "",
        onFailure: {
          behaviour: "halt",
          detail: "Held for review.",
        },
        sample: {
          in: "Contract",
          out: "4 milestones",
        },
        next: ["invoice"],
      },
      {
        id: "engineering",
        label: "Engineering schedule",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Engineering contract",
        output: "Milestone schedule with a design stage",
        detail: "Engineering work bills a design stage up front, which no other schedule has.",
        onFailure: {
          behaviour: "halt",
          detail: "Held for review.",
        },
        sample: {
          in: "Contract",
          out: "5 milestones, design first",
        },
        next: ["invoice"],
      },
      {
        id: "materials",
        label: "Materials schedule",
        kind: "rule",
        position: {
          x: 900,
          y: 260,
        },
        input: "Materials contract",
        output: "Deposit and balance",
        detail: "",
        onFailure: {
          behaviour: "halt",
          detail: "Held for review.",
        },
        sample: {
          in: "Contract",
          out: "2 milestones",
        },
        next: ["invoice"],
      },
      {
        id: "invoice",
        label: "Raise the QuickBooks invoice",
        kind: "io",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Schedule",
        output: "Invoice",
        detail: "Idempotent on the contract id. A retried webhook must not raise a second invoice — the failure customers actually notice.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts with the payload. Never silently gives up.",
        },
        sample: {
          in: "5 milestones",
          out: "Invoice #INV-8841",
        },
      },
      {
        id: "payment",
        label: "Enable card payment",
        kind: "io",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Invoice id",
        output: "Invoice with a payment link",
        detail: "A separate step because it fails independently, and because whether card is offered at all is its own automation rather than a flag \u2014 see Card payment eligibility. An invoice without a link is inconvenient; a missing invoice is a lost month.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the invoice stands without the link.",
        },
        sample: {
          in: "Invoice #INV-8841",
          out: "Payment link attached",
        },
      },
      {
        id: "back",
        label: "Write back to the CRM",
        kind: "io",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Invoice number and link",
        output: "CRM updated",
        detail: "Closes the loop so the salesperson sees the invoice where they already work.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts. A missing write-back means someone raises a second invoice by hand.",
        },
        sample: {
          in: "Invoice #INV-8841",
          out: "Job updated",
        },
      },
    ],
  },
  {
    id: "estimate-to-invoice",
    title: "Signed estimate to invoice",
    sampleRecord: "A design estimate signed online, for a customer paying by card.",
      scenarios: [
        {
          id: "happy",
          label: "Signed and invoiced",
          summary: "The straightforward path.",
        },
        {
          id: "replay",
          label: "A replayed signature",
          summary: "Idempotency stops a second invoice.",
          failsAt: "invoice",
        },
      ],
    problem: "A signed estimate sat in the CRM until somebody noticed and keyed the numbers into QuickBooks, days late.",
    outcome: "Signing raises the invoice within seconds, with a payment link attached.",
    nodes: [
      {
        id: "signed",
        label: "Estimate signed",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Signature event",
        output: "Estimate id and totals",
        detail: "A webhook rather than a poll; this is the moment a customer is most ready to pay.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Estimate #E-771",
          out: "Signed",
        },
      },
      {
        id: "validate",
        label: "Validate the estimate",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Totals and line items",
        output: "Approved, or held",
        detail: "Totals reconcile, the customer exists, nothing is negative.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops before any write.",
        },
        sample: {
          in: "Line items",
          out: "Reconciled",
        },
      },
      {
        id: "invoice",
        label: "Create the invoice",
        kind: "io",
        position: {
          x: 600,
          y: 130,
        },
        input: "Validated estimate",
        output: "QuickBooks invoice",
        detail: "Idempotent on the estimate id; a retried webhook must not raise a second invoice.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts with the payload.",
        },
        sample: {
          in: "Estimate",
          out: "Invoice #INV-8842",
        },
      },
      {
        id: "payment",
        label: "Enable card payment",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Invoice id",
        output: "Invoice with a link",
        detail: "Separate because it fails independently. Whether card is offered is decided by its own flow \u2014 see Card payment eligibility.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the invoice stands without it.",
        },
        sample: {
          in: "Invoice id",
          out: "Link attached",
        },
      },
      {
        id: "back",
        label: "Write back to the CRM",
        kind: "io",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Invoice number",
        output: "CRM updated",
        detail: "Closes the loop where the salesperson already works.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "INV-8842",
          out: "Job updated",
        },
      },
    ],
  },
  {
    id: "payment-verification",
    title: "Payment verification back to the CRM",
    sampleRecord: "A card payment that clears three days after the invoice was raised.",
      scenarios: [
        {
          id: "happy",
          label: "A full payment",
          summary: "Clears, matches, updates the job.",
        },
        {
          id: "partial",
          label: "A deposit only",
          summary: "Part-paid is the common case and means something different downstream.",
        },
        {
          id: "unmatched",
          label: "Payment with no reference",
          summary: "Held for review. Guessing which job a payment belongs to is how the wrong job starts.",
          failsAt: "match",
        },
      ],
    problem: "Payment landed in the accounting system and nowhere else, so the team scheduling work had no idea whether a deposit had cleared.",
    outcome: "A cleared payment updates the job within minutes, and schedulers stop asking accounts.",
    nodes: [
      {
        id: "paid",
        label: "Payment cleared",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Cleared-funds event",
        output: "Amount and invoice reference",
        detail: "Triggered on cleared funds, not on payment being initiated. The difference matters when a card is declined.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Cleared £4,260",
          out: "Invoice INV-8841",
        },
      },
      {
        id: "match",
        label: "Match to the job",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Invoice reference",
        output: "Job record",
        detail: "Deterministic lookup through the invoice, never by customer name. Two jobs for one customer is the normal case.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds. An unmatched payment is reviewed, never guessed.",
        },
        sample: {
          in: "INV-8841",
          out: "Job #B-3092",
        },
      },
      {
        id: "balance",
        label: "Compare against what is owed",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Payment and balance",
        output: "Paid, part-paid or overpaid",
        detail: "Partial payments are the common case and each means something different downstream.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops and alerts on an overpayment; that is always a person’s decision.",
        },
        sample: {
          in: "£4,260 of £14,200",
          out: "Part-paid",
        },
      },
      {
        id: "update",
        label: "Update the job",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Payment status",
        output: "CRM updated",
        detail: "Only after funds clear. Marking a job paid on an intent is how work starts on money that never arrives.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "Part-paid",
          out: "Job updated",
        },
      },
      {
        id: "notify",
        label: "Tell the scheduler",
        kind: "io",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Updated job",
        output: "Notification",
        detail: "The reason the flow exists: the people who need to know are not the people watching the bank.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Job #B-3092",
          out: "Scheduler notified",
        },
      },
    ],
  },
  {
    id: "qbo-to-billcom",
    title: "Invoice sync: QuickBooks to Bill.com",
    sampleRecord: "An invoice raised in QuickBooks with three line items and 30-day terms.",
      scenarios: [
        {
          id: "happy",
          label: "A straightforward invoice",
          summary: "Three line items, terms that map cleanly, both systems available.",
        },
        {
          id: "duplicate",
          label: "A replayed webhook",
          summary: "The same invoice arrives twice. Deduplication stops it there, which is the difference between a sync and a stream of duplicate bills.",
          failsAt: "idempotent",
        },
        {
          id: "mismatch",
          label: "Totals do not reconcile",
          summary: "The mapped lines do not sum to the source total. Nothing is written — a bill wrong by a penny is worse than a bill that is late.",
          failsAt: "reconcile",
        },
        {
          id: "billcom-down",
          label: "Bill.com is unavailable",
          summary: "Retries with backoff, then alerts with the payload. A lost invoice surfaces at month end when it is expensive.",
          failsAt: "push",
        },
      ],
    problem: "Invoices raised in QuickBooks had to be recreated in Bill.com for approval and payment. Two people, two keyboards, and a monthly reconciliation to find what had drifted.",
    outcome: "An invoice appears in Bill.com within a minute, line items intact, with a record of exactly what was sent.",
    nodes: [
      {
        id: "trigger",
        label: "Invoice created",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Webhook",
        output: "Invoice id",
        detail: "Everything keys off the invoice id, so a duplicate webhook is detectable rather than a second bill.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the provider replays unacknowledged events.",
        },
        sample: {
          in: "Webhook",
          out: "Invoice id 8841",
        },
      },
      {
        id: "fetch",
        label: "Fetch the invoice",
        kind: "io",
        position: {
          x: 300,
          y: 130,
        },
        input: "Invoice id",
        output: "Invoice with line items",
        detail: "The webhook carries an id, not the document. Fetching guarantees current state.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "8841",
          out: "3 line items, £14,200",
        },
      },
      {
        id: "idempotent",
        label: "Deduplicate",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Fetched invoice",
        output: "First-time only",
        detail: "Retries are normal and duplicates are expensive; every retry would otherwise be a second bill.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops silently — a duplicate is the expected outcome here, not an error.",
        },
        sample: {
          in: "8841",
          out: "Not seen before",
        },
      },
      {
        id: "map",
        label: "Map line items",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "QuickBooks lines",
        output: "Bill.com payload",
        detail: "The two systems disagree about rounding, tax and required fields. Deterministic and versioned, because a silent mismatch is money.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. A mapping failure must never be approximated.",
        },
        sample: {
          in: "3 lines",
          out: "3 mapped lines",
        },
      },
      {
        id: "reconcile",
        label: "Reconcile totals",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Mapped payload",
        output: "Balanced, or a halt",
        detail: "The mapped lines must sum to the source total. A bill wrong by a penny is worse than a bill that is late.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops and alerts with both totals.",
        },
        sample: {
          in: "£14,200 vs £14,200",
          out: "Balanced",
        },
      },
      {
        id: "push",
        label: "Create in Bill.com",
        kind: "io",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Validated payload",
        output: "Bill.com invoice",
        detail: "Failures retry with backoff rather than dropping; a lost invoice surfaces at month end when it is expensive.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts with the payload.",
        },
        sample: {
          in: "Payload",
          out: "Bill.com #BC-2201",
        },
      },
      {
        id: "audit",
        label: "Log both sides",
        kind: "io",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Request and response",
        output: "Audit record",
        detail: "When the two systems disagree later, this is the only thing that settles it.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts if the log write fails; an unlogged sync is one nobody can defend.",
        },
        sample: {
          in: "Req/res",
          out: "Logged",
        },
      },
    ],
  },
  {
    id: "billcom-to-qbo",
    title: "Bill sync: Bill.com to QuickBooks",
    sampleRecord: "A bill approved in Bill.com from a supplier whose name differs slightly from the QuickBooks record.",
      scenarios: [
        {
          id: "happy",
          label: "A known vendor",
          summary: "Matched with high confidence and coded from history.",
        },
        {
          id: "fuzzy",
          label: "A vendor name that nearly matches",
          summary: "Below the confidence floor it waits. A bill against the wrong vendor is harder to unpick than one that waited.",
          failsAt: "vendor",
        },
      ],
    problem: "Bills approved in Bill.com were re-entered into QuickBooks by hand, so the books lagged approvals by days.",
    outcome: "An approved bill lands in QuickBooks coded to the right account without anyone retyping it.",
    nodes: [
      {
        id: "approved",
        label: "Bill approved",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Approval event",
        output: "Bill payload",
        detail: "Approval, not creation, is the trigger. Syncing unapproved bills puts things in the books nobody agreed to pay.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Approval",
          out: "Bill #BL-118",
        },
      },
      {
        id: "vendor",
        label: "Match the vendor",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Vendor name",
        output: "Matched, or held",
        detail: "Fuzzy matching with a confidence floor. Below it the bill waits — a bill against the wrong vendor is harder to unpick than one that waited.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds below the confidence floor. Never guesses.",
        },
        sample: {
          in: "\"Ridgeway Plant Ltd\"",
          out: "92% — matched",
        },
      },
      {
        id: "code",
        label: "Apply account coding",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Bill and vendor history",
        output: "Coded bill",
        detail: "Rules from prior coding for that vendor. An accountant must be able to explain why a cost landed where it did.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds for coding by hand.",
        },
        sample: {
          in: "Vendor history",
          out: "Coded to Plant Hire",
        },
      },
      {
        id: "create",
        label: "Create the bill",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Coded bill",
        output: "QuickBooks bill",
        detail: "Idempotent on the Bill.com id.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "Coded bill",
          out: "QuickBooks #B-771",
        },
      },
      {
        id: "reconcile",
        label: "Flag unmatched",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Sync result",
        output: "Exception list",
        detail: "What could not be matched is surfaced as a short list. Silent skips are how a month closes short.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts; the list is the deliverable.",
        },
        sample: {
          in: "1 unmatched",
          out: "Exception raised",
        },
      },
    ],
  },
  {
    id: "credit-sync",
    title: "Credit memos and vendor credits",
    sampleRecord: "A vendor credit raised in Bill.com against a bill already paid.",
      scenarios: [
        {
          id: "happy",
          label: "A vendor credit",
          summary: "Raised against an unpaid bill, matched and posted.",
        },
        {
          id: "paid",
          label: "The bill was already paid",
          summary: "A credit against a paid bill is a refund, not a reduction. Treating them the same is how a supplier gets paid twice.",
          failsAt: "paid",
        },
        {
          id: "unlinked",
          label: "Nothing to offset",
          summary: "A credit with no reference. Held for a person rather than posted somewhere plausible.",
          failsAt: "link",
        },
      ],
    problem: "Credits were the exception nobody automated, entered by hand in whichever system someone remembered, drifting in the direction that flatters the books.",
    outcome: "Credits move both directions on the same rails as invoices, with the same audit trail and the same refusal to guess.",
    nodes: [
      {
        id: "trigger",
        label: "Credit raised",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Credit event",
        output: "Normalised credit",
        detail: "One handler for both directions. Credits are rare enough that two integrations would each rot from disuse.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Vendor credit",
          out: "Normalised",
        },
      },
      {
        id: "direction",
        label: "Determine direction",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Credit and origin",
        output: "Customer or vendor credit",
        detail: "The two touch different ledgers and different approvals. This is the fork the manual process kept getting wrong.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. Posting to the wrong ledger is the error this exists to prevent.",
        },
        sample: {
          in: "origin: bill.com",
          out: "Vendor credit",
        },
      },
      {
        id: "link",
        label: "Link to the original",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Credit and reference",
        output: "Bound credit, or held",
        detail: "A credit with nothing to offset is an error, not a transaction.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds for a person rather than posting somewhere plausible.",
        },
        sample: {
          in: "ref: BL-118",
          out: "Bound to bill BL-118",
        },
      },
      {
        id: "sign",
        label: "Check sign and amount",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Bound credit",
        output: "Validated",
        detail: "A credit larger than what it offsets, or the wrong way round, is caught here. Arithmetic is exactly what should not be delegated to a model.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops and alerts.",
        },
        sample: {
          in: "£400 vs £2,100",
          out: "Valid",
        },
      },
      {
        id: "paid",
        label: "Handle already-paid bills",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Validated credit",
        output: "Refund or offset",
        detail: "A credit against a paid bill is a refund, not a reduction. Treating them the same is how a supplier is paid twice.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds. This case always involves a person.",
        },
        sample: {
          in: "Bill already paid",
          out: "Refund path",
        },
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
        output: "Credit in the counterpart",
        detail: "Same idempotency and retry behaviour as the invoice path.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "Credit",
          out: "QuickBooks credit created",
        },
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
        detail: "Credits are what an auditor looks at first.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts on failure.",
        },
        sample: {
          in: "Req/res",
          out: "Logged",
        },
      },
    ],
  },
  {
    id: "folder-repair",
    title: "Self-healing folder repair",
    sampleRecord: "A nightly sweep finds a job whose Permits folder was renamed by hand and whose Design folder is missing entirely.",
      scenarios: [
        {
          id: "happy",
          label: "A missing folder",
          summary: "The safe case: something that should exist does not, so it is recreated without asking.",
          takes: { "diff": "fix-missing" },
        },
        {
          id: "renamed",
          label: "Someone renamed a folder",
          summary: "Never undone automatically. A person renamed it for a reason, and silently reverting their change is how automation loses trust.",
          takes: { "diff": "fix-renamed" },
        },
        {
          id: "ambiguous",
          label: "Two folders with the same name",
          summary: "Cannot be resolved from names alone. Guessing here merges or orphans documents, so it waits.",
          takes: { "diff": "escalate" },
        },
        {
          id: "verify-fails",
          label: "The repair did not work",
          summary: "The repair reported success and the re-check disagrees. This is the one failure this flow cannot tolerate silently.",
          takes: { "diff": "fix-missing" },
          failsAt: "verify",
        },
      ],
    problem: "The provisioning automation occasionally lost a race, and people renamed and moved folders by hand. Broken trees were found weeks later by whoever needed a document.",
    outcome: "Broken trees are found and repaired nightly, and only genuinely ambiguous cases reach a person.",
    nodes: [
      {
        id: "schedule",
        label: "Nightly sweep",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Scheduled trigger",
        output: "Every active job",
        detail: "Scheduled rather than event-driven, because the failures it repairs are exactly the ones that produced no event.",
        onFailure: {
          behaviour: "alert",
          detail: "Missing a night is tolerable; missing it silently is not, so a skipped run alerts.",
        },
        sample: {
          in: "—",
          out: "412 active jobs",
        },
      },
      {
        id: "expected",
        label: "Build the expected tree",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Job record",
        output: "The folder names that should exist",
        detail: "Derived from the same naming rules the provisioning flow uses, so the two can never disagree about what \"correct\" means.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. Repairing against the wrong expectation would do more damage than the fault.",
        },
        sample: {
          in: "Job #A-4417",
          out: "5 expected folder names",
        },
      },
      {
        id: "actual",
        label: "Read what is there",
        kind: "io",
        position: {
          x: 600,
          y: 130,
        },
        input: "Job folder id",
        output: "Folders that actually exist",
        detail: "Read-only. This step never modifies anything, so a bug here cannot destroy a tree.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; on exhaustion skips the job and reports it, rather than assuming the folders are missing.",
        },
        sample: {
          in: "Root folder id",
          out: "3 of 5 present, 1 renamed",
        },
      },
      {
        id: "diff",
        label: "Compare",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Expected and actual",
        output: "A list of faults, by type",
        detail: "The whole design rests on classifying the fault: missing, renamed, duplicated or moved. Each needs different handling and only one is safe to fix automatically.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. An unclassified difference is never acted on.",
        },
        sample: {
          in: "Expected vs actual",
          out: "{ missing: 1, renamed: 1 }",
        },
        next: ["fix-missing", "fix-renamed", "escalate"],
        sampleTakes: "fix-missing",
      },
      {
        id: "fix-missing",
        label: "Recreate missing folders",
        kind: "io",
        position: {
          x: 1200,
          y: 0,
        },
        input: "Missing folder names",
        output: "Folders created",
        detail: "Safe to automate: creating a folder that should exist cannot destroy anything.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then escalates. Worst case a folder stays missing, which is where it started.",
        },
        sample: {
          in: "{ missing: [\"Design\"] }",
          out: "Design folder created",
        },
        next: ["verify"],
      },
      {
        id: "fix-renamed",
        label: "Restore a renamed folder",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Renamed folder",
        output: "Rename proposed, not applied",
        detail: "Deliberately proposes rather than acts. Someone renamed it for a reason, and silently undoing a person’s change is how automation loses trust.",
        onFailure: {
          behaviour: "hold",
          detail: "Always holds — this branch never writes without approval.",
        },
        sample: {
          in: "\"Permits OLD\"",
          out: "Proposed: rename to \"Permits\"",
        },
        next: ["review"],
      },
      {
        id: "escalate",
        label: "Duplicated or moved",
        kind: "human",
        position: {
          x: 1200,
          y: 260,
        },
        input: "Ambiguous fault",
        output: "A short review item",
        detail: "Duplicates and moves cannot be resolved from names alone. Guessing here merges or orphans documents.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds by definition.",
        },
        sample: {
          in: "2 folders named \"Photos\"",
          out: "Queued for review",
        },
        next: ["review"],
      },
      {
        id: "review",
        label: "Someone decides",
        kind: "human",
        position: {
          x: 1500,
          y: 195.0,
        },
        input: "Proposed changes",
        output: "Approved or dismissed",
        detail: "The only step that can undo a human action is another human.",
        onFailure: {
          behaviour: "hold",
          detail: "Waits indefinitely. An unreviewed proposal is harmless.",
        },
        sample: {
          in: "Proposed rename",
          out: "Approved",
        },
        next: ["verify"],
      },
      {
        id: "verify",
        label: "Re-check the tree",
        kind: "rule",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Repaired job",
        output: "Clean, or still broken",
        detail: "Confirms the repair worked rather than assuming it did. A repair automation that reports success without checking is worse than none.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts. A repair that silently failed is the one fault this flow cannot tolerate.",
        },
        sample: {
          in: "Job #A-4417",
          out: "5 of 5 present",
        },
      },
      {
        id: "report",
        label: "Nightly report",
        kind: "io",
        position: {
          x: 2100,
          y: 130,
        },
        input: "Sweep results",
        output: "One summary",
        detail: "A single digest rather than an alert per job. Per-job alerts on a nightly sweep are how people mute the channel.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the log remains the record of what happened.",
        },
        sample: {
          in: "412 jobs, 6 repaired, 2 held",
          out: "Digest sent",
        },
      },
    ],
  },
  {
    id: "document-provisioning",
    title: "Document folder provisioning",
    sampleRecord: "A new job created on a Friday afternoon, where the folder root already exists from a cancelled earlier job.",
      scenarios: [
        {
          id: "happy",
          label: "A new job",
          summary: "Root created, five subfolders, permissions applied.",
        },
        {
          id: "exists",
          label: "The root already exists",
          summary: "From a cancelled earlier job. Find-or-create means a re-run does not produce a second tree.",
        },
        {
          id: "permissions",
          label: "Permissions fail to apply",
          summary: "Stops and alerts. An open folder is a real problem, not a cosmetic one.",
          failsAt: "permissions",
        },
      ],
    problem: "Every new job needed a folder structure created by hand, so half were missing, misnamed, or in the wrong place, and photos ended up in personal drives.",
    outcome: "A consistent tree exists before anyone needs it, named the same way every time, with permissions already right.",
    nodes: [
      {
        id: "created",
        label: "Job created",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "New job",
        output: "Job id",
        detail: "Runs at creation rather than on first upload. A folder that appears only when someone remembers is one people work around.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Job #A-4418",
          out: "Job id",
        },
      },
      {
        id: "name",
        label: "Build the name",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Customer and job details",
        output: "Canonical folder name",
        detail: "Deterministic and stable, so a name never changes under someone who bookmarked it.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. A wrong name is worse than a missing folder.",
        },
        sample: {
          in: "Customer + job",
          out: "\"A-4418 — Fielding\"",
        },
      },
      {
        id: "root",
        label: "Find or create the root",
        kind: "io",
        position: {
          x: 600,
          y: 130,
        },
        input: "Folder name",
        output: "Root folder",
        detail: "Find-or-create rather than create. Re-running must not produce a second tree beside the first.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the find half means a retry is safe.",
        },
        sample: {
          in: "Name",
          out: "Existing root found",
        },
      },
      {
        id: "children",
        label: "Create the subfolders",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Root folder",
        output: "Five subfolders",
        detail: "Created together rather than one at a time; sequentially this took long enough that people made their own.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then hands to the repair sweep.",
        },
        sample: {
          in: "Root",
          out: "5 subfolders",
        },
      },
      {
        id: "permissions",
        label: "Apply permissions",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Created folders",
        output: "Access set",
        detail: "Applied at creation. A folder created open and tightened later is open for exactly as long as nobody checks.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops and alerts. An open folder is a real problem.",
        },
        sample: {
          in: "5 folders",
          out: "Permissions set",
        },
      },
      {
        id: "verify",
        label: "Verify the tree",
        kind: "rule",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Folder ids",
        output: "Complete, or a repair list",
        detail: "Confirms every folder exists before the link is published.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts and hands to the repair sweep.",
        },
        sample: {
          in: "5 ids",
          out: "Complete",
        },
      },
      {
        id: "link",
        label: "Attach the link",
        kind: "io",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Verified tree",
        output: "CRM updated",
        detail: "So nobody has to search for it, which is where people give up and use their own drive.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Folder link",
          out: "Job updated",
        },
      },
    ],
  },
  {
    id: "partner-referral",
    title: "Partner referral intake",
    instances: {
      count: 11,
      label: "referral partners, one design",
    },
    sampleRecord: "A referral submitted through one partner’s own branded form, for a customer already in the system.",
      scenarios: [
        {
          id: "happy",
          label: "A new customer",
          summary: "A referral for someone not in the system. The simple path.",
          takes: { "dupe": "fresh" },
        },
        {
          id: "existing",
          label: "A customer already known",
          summary: "The common case, and the source of every commission argument. Attached to the existing record rather than duplicated.",
          takes: { "dupe": "existing" },
        },
        {
          id: "dashboard-down",
          label: "The partner dashboard fails",
          summary: "The credit is recorded but the partner cannot see it. Retries, then alerts — a partner who cannot see their referrals will ask.",
          takes: { "dupe": "existing" },
          failsAt: "dashboard",
        },
      ],
    problem: "Each referral partner wanted their own form, their own branding and their own view of what they had sent. Eleven partners meant eleven of everything.",
    outcome: "One design, deployed eleven times. A new partner is a configuration entry and a form, not a new build.",
    nodes: [
      {
        id: "form",
        label: "Partner’s form",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Submission from a partner-branded form",
        output: "Referral with a partner id",
        detail: "Every partner gets their own form; every form posts the same shape. That constraint is what makes the rest reusable.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the provider replays unacknowledged submissions.",
        },
        sample: {
          in: "{ partner_id, customer, job_type }",
          out: "Referral received",
        },
      },
      {
        id: "partner",
        label: "Resolve the partner",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Partner id",
        output: "Partner record and terms",
        detail: "A lookup, not a branch. Adding a partner adds a row, not a code path — the reason this is one design and not eleven.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. A referral credited to the wrong partner is a commission dispute.",
        },
        sample: {
          in: "partner_id: 7",
          out: "Partner record, 10% terms",
        },
      },
      {
        id: "dupe",
        label: "Check for an existing customer",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Customer details",
        output: "New, or already known",
        detail: "Referrals for existing customers are the common case and the source of every commission argument.",
        onFailure: {
          behaviour: "hold",
          detail: "Ambiguous matches wait. This is the step where getting it wrong costs money.",
        },
        sample: {
          in: "{ phone, address }",
          out: "Existing customer found",
        },
        next: ["existing", "fresh"],
        sampleTakes: "existing",
      },
      {
        id: "existing",
        label: "Existing customer",
        kind: "rule",
        position: {
          x: 900,
          y: 0,
        },
        input: "Matched customer",
        output: "Referral attached to the existing record",
        detail: "Attached rather than duplicated, with the partner recorded against the referral instead of the customer.",
        onFailure: {
          behaviour: "hold",
          detail: "Held for review.",
        },
        sample: {
          in: "Customer #C-2210",
          out: "Referral linked",
        },
        next: ["credit"],
      },
      {
        id: "fresh",
        label: "New customer",
        kind: "io",
        position: {
          x: 900,
          y: 260,
        },
        input: "Unmatched referral",
        output: "New customer record",
        detail: "The straightforward path.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "New details",
          out: "Customer created",
        },
        next: ["credit"],
      },
      {
        id: "credit",
        label: "Record the referral credit",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Referral and partner terms",
        output: "Credit entry",
        detail: "Arithmetic on agreed terms. Deliberately not a model: this is money owed to a named business partner.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops and alerts. A wrong credit is worse than a late one.",
        },
        sample: {
          in: "10% of £14,200",
          out: "£1,420 pending",
        },
      },
      {
        id: "dashboard",
        label: "Update the partner dashboard",
        kind: "io",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Credit entry",
        output: "Row on that partner’s sheet",
        detail: "Each partner sees only their own referrals. Separate sheets rather than a filtered view, because a filter bug shows one partner another’s pipeline.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts. A partner who cannot see their referrals will ask, which is the real failure.",
        },
        sample: {
          in: "Credit entry",
          out: "Dashboard row added",
        },
      },
      {
        id: "notify",
        label: "Confirm to the partner",
        kind: "io",
        position: {
          x: 1800,
          y: 130,
        },
        input: "Referral outcome",
        output: "Confirmation",
        detail: "Closes the loop so partners are not chasing. The most common support question this removed.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the dashboard row is the durable record.",
        },
        sample: {
          in: "Referral #R-881",
          out: "Confirmation sent",
        },
      },
    ],
  },
  {
    id: "partner-onboarding",
    title: "Partner onboarding",
    sampleRecord: "A new referral partner signs up, supplying a logo and their commission terms.",
      scenarios: [
        {
          id: "happy",
          label: "A standard signup",
          summary: "Terms inside the agreed band, logo supplied, everything created.",
        },
        {
          id: "terms",
          label: "Terms outside the band",
          summary: "A commission rate above what was agreed. Held rather than accepted — the step that stops a typo becoming a contract.",
          failsAt: "validate",
        },
        {
          id: "form",
          label: "The form fails to deploy",
          summary: "Everything else can be repaired later. Without a form the partner cannot refer anyone, so this one alerts rather than retrying quietly.",
          failsAt: "form",
        },
      ],
    problem: "Onboarding a partner meant a folder, a form, a dashboard, credentials and a welcome pack, all created by hand over several days.",
    outcome: "A partner is live within minutes of signing up, with every artefact created consistently.",
    nodes: [
      {
        id: "signup",
        label: "Signup form",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "New partner submission",
        output: "Partner details and assets",
        detail: "The trigger. Everything downstream is derived from this one record.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; a lost signup is a lost partner.",
        },
        sample: {
          in: "{ business, contact, terms }",
          out: "Partner submission",
        },
      },
      {
        id: "validate",
        label: "Validate the terms",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Submitted terms",
        output: "Approved, or held",
        detail: "Commission terms outside the agreed band are held rather than accepted. This is the step that stops a typo becoming a contract.",
        onFailure: {
          behaviour: "hold",
          detail: "Holds for a person. Never auto-approves outside the band.",
        },
        sample: {
          in: "{ rate: 10 }",
          out: "Within band",
        },
      },
      {
        id: "record",
      fanOut: true,
        label: "Create the partner record",
        kind: "io",
        position: {
          x: 600,
          y: 130,
        },
        input: "Validated partner",
        output: "Partner id",
        detail: "Idempotent on the signup id.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "Validated partner",
          out: "partner_id: 12",
        },
        next: ["assets", "folder", "dashboard"],
      },
      {
        id: "assets",
        label: "Process the logo",
        kind: "io",
        position: {
          x: 900,
          y: 0,
        },
        input: "Uploaded logo",
        output: "Resized, hosted variants",
        detail: "Derived sizes generated once rather than resized on every page view.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; falls back to a placeholder rather than blocking the partner going live.",
        },
        sample: {
          in: "logo.png, 2.1MB",
          out: "3 hosted variants",
        },
        next: ["form"],
      },
      {
        id: "folder",
        label: "Create the partner folder",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Partner id",
        output: "Folder tree",
        detail: "Same naming rules as job folders, so one convention covers everything.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then hands to the repair sweep.",
        },
        sample: {
          in: "partner_id: 12",
          out: "Folder tree created",
        },
        next: ["form"],
      },
      {
        id: "dashboard",
        label: "Create the dashboard sheet",
        kind: "io",
        position: {
          x: 900,
          y: 260,
        },
        input: "Partner id",
        output: "Their own sheet",
        detail: "One sheet per partner, for the same isolation reason as the referral flow.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "partner_id: 12",
          out: "Sheet created",
        },
        next: ["form"],
      },
      {
        id: "form",
        label: "Deploy their referral form",
        kind: "io",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Partner record and assets",
        output: "A branded form",
        detail: "Cloned from a template and branded from the record. This is the artefact that makes the referral flow work for them.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts. Everything else can be repaired later; without a form the partner cannot refer anyone.",
        },
        sample: {
          in: "Partner + logo",
          out: "Branded form live",
        },
      },
      {
        id: "welcome",
        label: "Send the welcome pack",
        kind: "io",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Everything above",
        output: "Email with links",
        detail: "Sent last, on purpose: it links to artefacts that must already exist.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries. Sending before the form exists would be worse than sending late.",
        },
        sample: {
          in: "All artefacts",
          out: "Welcome email sent",
        },
      },
    ],
  },
  {
    id: "salesperson-routing",
    title: "Salesperson lead routing",
    sampleRecord: "A lead from one salesperson’s personal enquiry form, arriving while they are on leave.",
      scenarios: [
        {
          id: "happy",
          label: "Owner available",
          summary: "Straight to the person named on the form.",
        },
        {
          id: "leave",
          label: "Owner on leave",
          summary: "Falls back to the general queue, which is always staffed. A lead sitting with someone on holiday is the failure this prevents.",
        },
        {
          id: "unknown",
          label: "Unknown owner id",
          summary: "Stops rather than routing arbitrarily.",
          failsAt: "owner",
        },
      ],
    problem: "Each salesperson wanted enquiries from their own contacts to reach them directly rather than the general queue.",
    outcome: "Personal enquiries route straight to their owner, with cover when that person is unavailable.",
    nodes: [
      {
        id: "form",
        label: "Personal form",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Submission from a salesperson’s own form",
        output: "Lead with an owner id",
        detail: "One template deployed per salesperson. The templating is the engineering; any single instance is trivial.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "{ owner_id: 14 }",
          out: "Lead received",
        },
      },
      {
        id: "owner",
        label: "Resolve the owner",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Owner id",
        output: "Salesperson record",
        detail: "A lookup, not a branch, so adding a person is a row rather than a code path.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops rather than routing arbitrarily.",
        },
        sample: {
          in: "owner_id: 14",
          out: "Record found",
        },
      },
      {
        id: "available",
        label: "Check availability",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Owner record",
        output: "Available, or covering owner",
        detail: "Leave and working hours are checked before assignment. A lead sitting with someone on holiday is the failure this prevents.",
        onFailure: {
          behaviour: "halt",
          detail: "Defaults to the general queue, which is always staffed.",
        },
        sample: {
          in: "On leave until Friday",
          out: "Cover: general queue",
        },
      },
      {
        id: "assign",
        label: "Assign",
        kind: "io",
        position: {
          x: 900,
          y: 130,
        },
        input: "Resolved owner",
        output: "Lead assigned",
        detail: "The write everything else keys off.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries, then alerts.",
        },
        sample: {
          in: "Queue",
          out: "Assigned",
        },
      },
      {
        id: "notify",
        label: "Notify",
        kind: "io",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Assigned lead",
        output: "Email and task",
        detail: "Sent to whoever actually owns it now, not whoever the form named.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; the task is the durable record.",
        },
        sample: {
          in: "Assignee",
          out: "Notified",
        },
      },
    ],
  },
  {
    id: "customer-lifecycle",
    title: "Customer lifecycle: archive, revive, cold",
    sampleRecord: "A lead with no contact for 90 days that gets in touch again the week after being archived.",
      scenarios: [
        {
          id: "happy",
          label: "A quiet lead is archived",
          summary: "Ninety days with no contact.",
        },
        {
          id: "revive",
          label: "They get in touch again",
          summary: "Immediate reactivation. An archive a customer cannot escape by getting in touch loses them twice.",
        },
        {
          id: "partial",
          label: "Archived in some systems only",
          summary: "A partial archive is reported, because a half-archived customer still receives marketing email.",
          failsAt: "archive",
        },
      ],
    problem: "Dead leads stayed in the active list forever, so the pipeline was inflated and the team worked records nobody expected to convert.",
    outcome: "The list reflects reality, and a returning customer comes straight back without anyone noticing they had gone.",
    nodes: [
      {
        id: "activity",
        label: "Read activity",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Contact, quote and appointment history",
        output: "Activity summary",
        detail: "Read from where activity already lives rather than asking anyone to maintain a status field by hand.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; a failed read leaves the record where it is.",
        },
        sample: {
          in: "90 days quiet",
          out: "No activity",
        },
      },
      {
        id: "rules",
        label: "Apply lifecycle rules",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Activity summary",
        output: "Active, cold or archived",
        detail: "Thresholds in a table. When someone asks why a record went cold, the answer is a number they can see and change.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops. Leaving a record active is always the safer default.",
        },
        sample: {
          in: "90 days",
          out: "Archive",
        },
      },
      {
        id: "archive",
        label: "Archive everywhere",
        kind: "io",
        position: {
          x: 600,
          y: 130,
        },
        input: "Archived record",
        output: "CRM, mailing lists and folders updated",
        detail: "Every system that knows the customer is updated together, or the record comes back to life somewhere nobody was looking.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; a partial archive is reported, because a half-archived customer still gets marketing email.",
        },
        sample: {
          in: "Record",
          out: "Archived in 3 systems",
        },
      },
      {
        id: "revive",
        label: "Return on contact",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Any new inbound activity",
        output: "Reactivated record",
        detail: "The path back is automatic and immediate. An archive a customer cannot escape by getting in touch loses them twice.",
        onFailure: {
          behaviour: "alert",
          detail: "Alerts. Failing to revive is the one failure a customer experiences directly.",
        },
        sample: {
          in: "New enquiry",
          out: "Reactivated",
        },
      },
      {
        id: "notify",
        label: "Tell the owner",
        kind: "io",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Reactivated record",
        output: "Notification",
        detail: "Whoever owned it before hears first.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "Reactivated",
          out: "Owner notified",
        },
      },
    ],
  },
  {
    id: "reporting-sync",
    title: "Scheduled reporting sync",
    sampleRecord: "The 02:00 run, on a night when one batch of records fails validation.",
      scenarios: [
        {
          id: "happy",
          label: "A clean night",
          summary: "Everything validates, the snapshot swaps atomically.",
          takes: { "validate": "load" },
        },
        {
          id: "rejects",
          label: "A batch with rejects",
          summary: "Six rows fail validation. They are quarantined with reasons rather than dropped or forced through.",
          takes: { "validate": "quarantine" },
        },
        {
          id: "load-fails",
          label: "The load fails midway",
          summary: "The previous snapshot stays readable throughout. Yesterday complete beats today partial.",
          takes: { "validate": "load" },
          failsAt: "load",
        },
      ],
    problem: "Reporting ran against the live system, so heavy queries slowed the tool the team was using and the numbers changed under whoever was reading them.",
    outcome: "Reporting reads a stable overnight snapshot, and the operational system is never queried by a dashboard.",
    nodes: [
      {
        id: "cron",
        label: "Scheduled trigger",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "02:00 daily",
        output: "Run started",
        detail: "Scheduled rather than event-driven, which nothing else in this catalogue is. Reporting does not need to be current to the second, and pretending it does is what puts load on the live system.",
        onFailure: {
          behaviour: "alert",
          detail: "A missed run alerts. Stale figures presented as current are the failure to avoid.",
        },
        sample: {
          in: "—",
          out: "Run 2026-08-09",
        },
      },
      {
        id: "extract",
        label: "Extract changed records",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Last run timestamp",
        output: "Only what changed",
        detail: "Incremental on a watermark rather than a full copy, so the window stays short as the dataset grows.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops and keeps the old watermark, so the next run picks up everything missed.",
        },
        sample: {
          in: "since 2026-08-08T02:00",
          out: "1,204 changed",
        },
      },
      {
        id: "validate",
        label: "Validate the batch",
        kind: "rule",
        position: {
          x: 600,
          y: 130,
        },
        input: "Extracted rows",
        output: "Clean rows, and rejects",
        detail: "Rows that fail validation are set aside rather than dropped or forced through.",
        onFailure: {
          behaviour: "halt",
          detail: "Stops on a high reject rate. A batch that is mostly rejects means the source changed shape.",
        },
        sample: {
          in: "1,204 rows",
          out: "1,198 clean, 6 rejected",
        },
        next: ["load", "quarantine"],
        sampleTakes: "load",
      },
      {
        id: "load",
        label: "Load the snapshot",
        kind: "io",
        position: {
          x: 900,
          y: 0,
        },
        input: "Clean rows",
        output: "Reporting tables",
        detail: "Written to a separate store, so a reporting query can never lock an operational table.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries into a staging table; the previous snapshot stays readable throughout.",
        },
        sample: {
          in: "1,198 rows",
          out: "Snapshot written",
        },
        next: ["swap"],
      },
      {
        id: "quarantine",
        label: "Quarantine rejects",
        kind: "io",
        position: {
          x: 900,
          y: 260,
        },
        input: "Rejected rows",
        output: "A review list",
        detail: "Kept with the reason they failed. Silently dropping them is how a report is quietly wrong for a month.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries; rejects are never discarded.",
        },
        sample: {
          in: "6 rows",
          out: "Quarantined with reasons",
        },
        next: ["swap"],
      },
      {
        id: "swap",
        label: "Publish the snapshot",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Loaded tables",
        output: "Snapshot live",
        detail: "An atomic swap, so a reader sees the old snapshot or the new one, never a half-loaded table.",
        onFailure: {
          behaviour: "halt",
          detail: "Leaves the previous snapshot in place. Yesterday’s complete numbers beat today’s partial ones.",
        },
        sample: {
          in: "Staged tables",
          out: "Published",
        },
      },
      {
        id: "digest",
        label: "Report on the run",
        kind: "io",
        position: {
          x: 1500,
          y: 130,
        },
        input: "Run result",
        output: "Summary with reject count",
        detail: "The reject count is the point. A sync that reports only success teaches nobody anything.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "1,198 loaded, 6 held",
          out: "Digest sent",
        },
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications and escalation",
    sampleRecord: "A batch of routine events plus one failed payment sync at 03:00.",
      scenarios: [
        {
          id: "happy",
          label: "A routine batch",
          summary: "Summarised into one digest.",
        },
        {
          id: "urgent",
          label: "One urgent event",
          summary: "Skips the digest and goes to the loud channel.",
        },
        {
          id: "unacked",
          label: "Nobody acknowledges",
          summary: "Escalates. An alert nobody acknowledges is not an alert.",
          failsAt: "escalate",
        },
      ],
    problem: "Alerts went to a shared inbox everyone had muted, so urgent things waited alongside routine noise.",
    outcome: "Routine updates stay quiet, and the few things needing a person now reach one.",
    nodes: [
      {
        id: "event",
        label: "Operational event",
        kind: "io",
        position: {
          x: 0,
          y: 130,
        },
        input: "Events from every connected system",
        output: "Normalised event",
        detail: "One pipeline rather than each system having its own opinion about what deserves an alert.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries.",
        },
        sample: {
          in: "12 events",
          out: "Normalised",
        },
      },
      {
        id: "severity",
        label: "Classify severity",
        kind: "rule",
        position: {
          x: 300,
          y: 130,
        },
        input: "Event and context",
        output: "Routine, important or urgent",
        detail: "Explicit thresholds. This decides whether someone gets woken up, which must be inspectable.",
        onFailure: {
          behaviour: "halt",
          detail: "Defaults to urgent. Under-alerting is the worse error here.",
        },
        sample: {
          in: "Failed sync",
          out: "Urgent",
        },
      },
      {
        id: "summarise",
        label: "Summarise the batch",
        kind: "model",
        position: {
          x: 600,
          y: 130,
        },
        input: "A window of routine events",
        output: "One readable digest",
        detail: "The model summarises the quiet majority. It never decides what is urgent — it writes up what the rules already sorted.",
        onFailure: {
          behaviour: "alert",
          detail: "Falls back to a plain list. A missing summary is not worth losing the events over.",
        },
        sample: {
          in: "11 routine events",
          out: "Digest paragraph",
        },
      },
      {
        id: "route",
        label: "Send by channel",
        kind: "rule",
        position: {
          x: 900,
          y: 130,
        },
        input: "Classified event",
        output: "Digest, chat or SMS",
        detail: "Channel follows severity, so the loud channel stays rare enough that people still react.",
        onFailure: {
          behaviour: "retry",
          detail: "Retries on the next channel down.",
        },
        sample: {
          in: "Urgent",
          out: "SMS",
        },
      },
      {
        id: "escalate",
        label: "Escalate if unacknowledged",
        kind: "rule",
        position: {
          x: 1200,
          y: 130,
        },
        input: "Unacknowledged urgent alert",
        output: "Escalation",
        detail: "The step that makes the rest trustworthy. An alert nobody acknowledges is not an alert.",
        onFailure: {
          behaviour: "alert",
          detail: "Escalates further. This step failing silently defeats the whole flow.",
        },
        sample: {
          in: "No ack in 15m",
          out: "Escalated",
        },
      },
    ],
  },
];

export function findFlow(id: string): AutomationFlow | undefined {
  return AUTOMATION_FLOWS.find(flow => flow.id === id);
}
