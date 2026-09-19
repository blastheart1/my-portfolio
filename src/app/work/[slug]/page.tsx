import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { isDemoVisible } from '@/lib/content-queries';
import { findWorkProject, WORK_PROJECTS } from '@/lib/work-projects';
import { ogImageUrl } from '@/lib/og-url';
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
      // Declared explicitly. Setting `openGraph` at all replaces the parent's,
      // so a route that declares it and omits images ends up with no card —
      // which is what happened here until an end-to-end check caught it.
      images: [
        {
          url: ogImageUrl({
            title: project.title,
            subtitle: project.tagline,
            eyebrow: `~/work $ cat ${project.slug}`,
            chips: project.tech,
          }),
          width: 1200,
          height: 630,
          alt: `${project.title} — Antonio Luis Santos`,
        },
      ],
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
