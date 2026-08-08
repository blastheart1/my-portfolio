import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { isDemoVisible } from '@/lib/content-queries';
import { findWorkProject, WORK_PROJECTS } from '@/lib/work-projects';
import { SITE_URL } from '@/lib/site';
import CaseStudyLayout from '@/components/work/CaseStudyLayout';
import AutomationFlowExplorer from '@/components/work/AutomationFlow';

/**
 * /work/[slug] — one case study.
 *
 * A hidden section must 404 rather than merely drop its card from the index.
 * A demo that is switched off but still serves a live URL is not switched off,
 * and these URLs will be in a sitemap and a search index.
 */

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = findWorkProject(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.tagline,
    alternates: { canonical: `${SITE_URL}/work/${project.slug}` },
    openGraph: {
      type: 'article',
      url: `${SITE_URL}/work/${project.slug}`,
      title: `${project.title} — Antonio Luis Santos`,
      description: project.tagline,
    },
  };
}

export default async function WorkProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = findWorkProject(slug);
  if (!project) notFound();

  // Fails closed: an unreadable database hides the demo rather than exposing
  // an endpoint whose quota counters live in that same database.
  if (!(await isDemoVisible(project.sectionId))) notFound();

  return (
    <CaseStudyLayout project={project}>
      {project.slug === 'automation' ? <AutomationFlowExplorer /> : null}
    </CaseStudyLayout>
  );
}

export function generateStaticParams() {
  return WORK_PROJECTS.map(project => ({ slug: project.slug }));
}
