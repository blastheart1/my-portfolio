import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { isDemoVisible } from '@/lib/content-queries';
import { findWorkProject, WORK_PROJECTS } from '@/lib/work-projects';
import { SITE_URL } from '@/lib/site';
import StructuredData from '@/components/StructuredData';
import { workProjectNodes } from '@/lib/structured-data';
import CaseStudyLayout from '@/components/work/CaseStudyLayout';
import AutomationFlowExplorer from '@/components/work/AutomationFlow';
import RelayDemo from '@/components/work/RelayDemo';

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
    <CaseStudyLayout project={project} fillViewport={project.slug === 'automation'}>
      {/* This work's CreativeWork node, on the page it describes. It used to
          sit in the home page graph, which described work living here from a
          URL that is not it. */}
      <StructuredData nodes={workProjectNodes(project.slug)} />
      {project.slug === 'automation' && <AutomationFlowExplorer />}
      {project.slug === 'relay' && <RelayDemo />}
    </CaseStudyLayout>
  );
}

export function generateStaticParams() {
  return WORK_PROJECTS.map(project => ({ slug: project.slug }));
}
