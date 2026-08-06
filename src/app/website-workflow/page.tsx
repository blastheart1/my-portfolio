import type { Metadata } from 'next';
import WorkflowClient from './WorkflowClient';

export const metadata: Metadata = {
  title: 'Website Build Workflow | Code by Luis',
  description: 'F1 / Rocket-inspired 8-phase workflow for building high-end scroll-animation websites. Includes a prompt generator for Cursor AI.',
};

export default function WebsiteWorkflowPage() {
  return <WorkflowClient />;
}
