-- Positioning rewrite: the offer, the hero, the About paragraph.
--
--   node scripts/run-migration.mjs scripts/migrations/004_positioning_copy.sql --dry-run
--   node scripts/run-migration.mjs scripts/migrations/004_positioning_copy.sql --yes
--
-- ── READ THIS BEFORE RUNNING ─────────────────────────────────────────────────
-- The three prices below are marked TODO(luis) and are carried over from the
-- old web-design packages. They are placeholders for a DIFFERENT set of
-- engagements and are almost certainly wrong for them. Set them before this
-- runs, or run it and correct them in /edit immediately after.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Why this exists:
--
-- The site sells AI integration and decision automation in its title, its
-- JSON-LD, its FAQ and its llms.txt. What it actually offered was three
-- website packages priced by page count: "Up to 5 pages", "Contact form",
-- "Unlimited pages", "Dedicated project manager". Nothing a company looking
-- for an automation engineer would recognise as the thing they need.
--
-- The section is also switched off (sections.visible = false for 'services'),
-- so the only place those offers appeared at all was the structured data —
-- schema advertising prices no visitor could see. It stays switched off here,
-- because the three-card pricing layout is being replaced with a different
-- presentation; this migration fixes the CONTENT so that whatever renders it
-- next is describing the right work.
--
-- Every statement is an UPDATE guarded by a WHERE, with the previous value in
-- a comment above it, so reverting is copy-paste. Nothing is deleted.

-- ── Service tiers → engagements ──────────────────────────────────────────────
-- There are four engagements and three rows, so the fourth is inserted. Names
-- are matched on the existing values.

-- was: 'Starter' / 'Launch fast, look sharp' / 'Get a professional web
--      presence up in days, not months.' / {Up to 5 pages, Responsive +
--      mobile-first, Contact form, SEO basics + Analytics, Hosting & domain
--      setup, 7-day email support}
UPDATE service_tiers SET
  name     = 'Automation Audit',
  tagline  = 'Find out what is worth automating',
  outcome  = 'A written map of the process you hate most, with the volumes, the failure points, and a ranked list of what to automate first. Fixed fee, credited against a build if you go ahead.',
  features = ARRAY[
    'Process mapped end to end',
    'Volume and error-rate baseline',
    'Rules-vs-model recommendation per step',
    'Ranked build plan with effort estimates',
    'Yours to keep, whoever builds it'
  ],
  price_usd  = 599,  -- TODO(luis): an audit is priced on scope, not on the old Starter number
  price_php  = NULL,
  is_popular = false,
  sort_order = 0
WHERE name = 'Starter';

-- was: 'Professional' / 'Built to grow with you' / 'A full-featured platform
--      that drives leads, sales, and credibility.' / {Up to 15 pages,
--      E-commerce + payment gateways, Advanced SEO & schema markup, Analytics
--      dashboard, Social media integration, 14-day priority support}
UPDATE service_tiers SET
  name     = 'Integration Build',
  tagline  = 'Make two systems talk',
  outcome  = 'A monitored, reliable connection between platforms that currently need a person to copy data between them.',
  features = ARRAY[
    'API or webhook integration',
    'Field mapping and transformation',
    'Retry, backoff and failure alerting',
    'Runbook and handover documentation',
    'Post-launch support window'
  ],
  price_usd  = 1199,  -- TODO(luis)
  price_php  = NULL,
  is_popular = true,
  sort_order = 1
WHERE name = 'Professional';

-- was: 'Enterprise' / 'No limits, full control' / 'Custom-built systems
--      engineered for scale and long-term performance.' / {Unlimited pages,
--      Custom backend + APIs, Enterprise SEO strategy, Dedicated project
--      manager, Weekly progress reports, 30-day phone/chat/email support}
UPDATE service_tiers SET
  name     = 'AI Feature Build',
  tagline  = 'A model where it actually earns its place',
  outcome  = 'A model-backed feature with guardrails, an evaluation set, and a human in the loop wherever the decision warrants one.',
  features = ARRAY[
    'Model selection on cost, latency and data residency',
    'Prompt and retrieval design',
    'Guardrails and refusal handling',
    'Evaluation set, so quality is measurable rather than asserted',
    'Vendor-swappable by configuration, not by rebuild'
  ],
  price_usd  = 2999,  -- TODO(luis)
  price_php  = NULL,
  is_popular = false,
  sort_order = 2
WHERE name = 'Enterprise';

-- New. The retainer is the one most integration clients actually need, and
-- there was no row for it: automations sit between systems you do not
-- control, and an upstream API that changes its response shape on a Tuesday
-- breaks things quietly.
INSERT INTO service_tiers (name, tagline, outcome, features, price_usd, price_php, is_popular, sort_order, visible)
SELECT
  'Ongoing Retainer',
  'Someone watching it',
  'Monitoring, upstream API changes and incremental improvements for automations already in production.',
  ARRAY[
    'Monitoring and incident response',
    'Upstream API change handling',
    'Incremental improvements',
    'Monthly review',
    'Priority access'
  ],
  NULL,  -- TODO(luis): monthly rate
  NULL,
  false,
  3,
  true
WHERE NOT EXISTS (SELECT 1 FROM service_tiers WHERE name = 'Ongoing Retainer');

-- ── Hero ─────────────────────────────────────────────────────────────────────
-- was: 'I build AI driven applications and agentic systems that automate end
--      to end workflows, integrate complex platforms, and operate reliably at
--      scale with strong emphasis on security and fault tolerance.'
--
-- Engineer-to-engineer language. The replacement says the same thing in the
-- words the person with the problem would use.
UPDATE section_content SET
  field_value = 'I connect the systems your team re-keys data between, and add AI only where it beats a deterministic rule. Integration, workflow automation, and LLM features built to survive production.'
WHERE section_id = 'hero' AND field_key = 'description';

-- was: 'AI Full Stack Software Engineer'
UPDATE section_content SET
  field_value = 'AI Automation & Integration Engineer'
WHERE section_id = 'hero' AND field_key = 'tagline';

-- was: 'AI Full-Stack Software Engineer'
UPDATE section_content SET
  field_value = 'AI Automation & Integration Engineer'
WHERE section_id = 'hero' AND field_key = 'subtitle';

-- ── About ────────────────────────────────────────────────────────────────────
-- was: a CV paragraph listing ReactJS, Next.js, TailwindCSS, Supabase,
--      Python, FastAPI, Zapier, Intuit and Bill.com. It described tools rather
--      than a problem, opened with a job title, and never mentioned IBM ODM —
--      the one thing on the CV almost nobody else has.
UPDATE section_content SET
  field_value = 'Most companies lose hours every week to work that only exists because their software does not connect. Someone re-keys an order from one system into another, someone chases an approval over email, someone rebuilds the same report every Monday. I remove that work. Usually it is an API integration, sometimes a scheduled automation, sometimes an AI layer that reads messy input like an invoice or an inbound enquiry and routes it where it belongs.

Deciding what to automate is most of the job, and it is rarely where the interesting technology is. Some decisions belong in deterministic rules you can audit and explain to a regulator. Others genuinely need a language model, because the input is unstructured and the rulebook would never finish being written. Getting that split wrong is why a lot of "add AI to it" projects get quietly switched off six months later.

I have spent a decade on both sides of that line. Since 2020 I have built enterprise decision automation at Bell Canada on IBM Operational Decision Manager, where a wrong answer is expensive and every decision has to be traceable. Alongside it I build LLM-backed applications and agentic systems across OpenAI, Claude, Gemini and open-weight models running on hardware the client controls. I came up through QA leadership, so I design for the failure case first: a process that is fast and occasionally wrong costs more than the slow manual one it replaced.

My default is to reuse before replacing. Your team already knows the tools they have and your history already lives inside them, so a migration is a risk you choose to take on rather than a starting point. If the platform is a genuine dead end I will say so, and we plan a move you can survive.'
WHERE section_id = 'about' AND field_key = 'body';

-- ── Sections ─────────────────────────────────────────────────────────────────
-- Blog back on. The posts now have real URLs and pass a publish gate before
-- they are written, so the section is showing something worth showing.
-- 'services' deliberately stays false until its presentation is rebuilt.
UPDATE sections SET visible = true WHERE id = 'blog';

-- ── Subheadings ──────────────────────────────────────────────────────────────
-- was: 'Things I've shipped.'
UPDATE section_content SET
  field_value = 'Integrations, automations and AI features, shipped.'
WHERE section_id = 'projects' AND field_key = 'subheading';

-- was: 'Thoughts and writeups.'
UPDATE section_content SET
  field_value = 'Notes on integration, automation and where a model actually helps.'
WHERE section_id = 'blog' AND field_key = 'subheading';
