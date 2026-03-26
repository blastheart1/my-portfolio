'use client';

import { useEffect, useState } from 'react';
import ProjectsEditor from '@/components/admin/ProjectsEditor';

export default function ClientProjectsLoader() {
  const [projects, setProjects] = useState<Parameters<typeof ProjectsEditor>[0]['initialProjects'] | null>(null);

  useEffect(() => {
    fetch('/api/admin/projects')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, []);

  if (projects === null) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  return <ProjectsEditor initialProjects={projects} />;
}
