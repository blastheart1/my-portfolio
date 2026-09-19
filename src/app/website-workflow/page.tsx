import type { Metadata } from 'next';
import WorkflowClient from './WorkflowClient';

import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  // No "| Code by Luis" suffix: the root layout's title template already
  // appends "| Antonio Luis Santos", so the old value rendered as
  // "Website Build Workflow | Code by Luis | Antonio Luis Santos".
  title: 'Website Build Workflow',
  description: 'F1 / Rocket-inspired 8-phase workflow for building high-end scroll-animation websites. Includes a prompt generator for Cursor AI.',
  // This page had no `alternates`, so it inherited the root layout's canonical
  // — the home page — and told Google it was a duplicate of /. That is worse
  // than a missing canonical and is invisible in a browser. Guard rail N9 now
  // makes the whole class unshippable.
  alternates: { canonical: `${SITE_URL}/website-workflow` },
};

export default function WebsiteWorkflowPage() {
  return <WorkflowClient />;
}
