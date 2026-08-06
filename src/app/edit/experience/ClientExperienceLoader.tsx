'use client';

import ExperienceEditor from '@/components/admin/ExperienceEditor';
import AdminResource from '@/components/admin/AdminResource';
import { useAdminFetch, selectArray } from '@/hooks/useAdminFetch';

type Entries = Parameters<typeof ExperienceEditor>[0]['initialEntries'];

export default function ClientExperienceLoader() {
  const state = useAdminFetch<Entries>('/api/admin/experience', { select: selectArray });

  return (
    <AdminResource state={state}>
      {entries => <ExperienceEditor initialEntries={entries} />}
    </AdminResource>
  );
}
