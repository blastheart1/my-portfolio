import type { DemoSectionId } from '@/lib/content-queries';

/**
 * The case studies at /work.
 *
 * Each entry pairs a public slug with the section id that gates it, so the
 * admin toggle and the route agree by construction rather than by a lookup
 * table someone has to remember to update.
 *
 * Content lives here rather than in the database: unlike projects or services,
 * these are written prose tied to a specific hand-built page, not rows anyone
 * would edit from /edit. The section toggle is the part that needs to be
 * dynamic, and it is.
 */

export interface WorkProject {
  slug: string;
  sectionId: DemoSectionId;
  title: string;
  /** One line for the index card. */
  tagline: string;
  /** Longer framing for the case-study header and page metadata. */
  summary: string;
  tech: string[];
  /** The live application, where one exists separately from the demo. */
  liveUrl?: string;
  repoUrl?: string;
}

export const WORK_PROJECTS: WorkProject[] = [
  {
    slug: 'relay',
    sectionId: 'demo_relay',
    title: 'Relay',
    tagline: 'Turns a spoken voice note into a ready-to-send email, with an auditor checking it.',
    summary:
      'A voice note goes in, a drafted email comes out in the sender’s own voice. One model writes the draft and a second, from a different vendor, audits it for claims the transcript does not support. If the audit fails, the draft is regenerated once. Anything inferred is flagged in the interface, and nothing sends without a person approving it.',
    tech: ['Next.js', 'TypeScript', 'Whisper', 'OpenAI', 'Anthropic Claude', 'Neon Postgres'],
  },
  {
    slug: 'automation',
    sectionId: 'automation_lab',
    title: 'Automation Lab',
    tagline: 'Three real workflows, showing which steps are rules and which need a model.',
    summary:
      'Sanitized versions of automations built for live businesses. Each flow is broken into its steps, with deterministic rules and model-backed decisions marked differently, because choosing correctly between the two is most of the work and the part that decides whether an automation survives contact with production.',
    tech: ['Workflow design', 'API integration', 'Decision automation'],
  },
];

export function findWorkProject(slug: string): WorkProject | undefined {
  return WORK_PROJECTS.find(p => p.slug === slug);
}
