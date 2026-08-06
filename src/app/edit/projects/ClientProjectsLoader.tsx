'use client';

import ProjectsEditor from '@/components/admin/ProjectsEditor';
import AdminResource from '@/components/admin/AdminResource';
import { useAdminFetch, selectArray } from '@/hooks/useAdminFetch';

type Projects = Parameters<typeof ProjectsEditor>[0]['initialProjects'];

export default function ClientProjectsLoader() {
  const state = useAdminFetch<Projects>('/api/admin/projects', { select: selectArray });

  return (
    <AdminResource state={state}>
      {projects => <ProjectsEditor initialProjects={projects} />}
    </AdminResource>
  );
}
