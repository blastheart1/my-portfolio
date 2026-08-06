'use client';

import ServiceTierEditor, { type ServiceTier } from '@/components/admin/ServiceTierEditor';
import AdminResource from '@/components/admin/AdminResource';
import { useAdminFetch, selectArray } from '@/hooks/useAdminFetch';

export default function ClientServicesLoader() {
  const state = useAdminFetch<ServiceTier[]>('/api/admin/services', { select: selectArray });

  return (
    <AdminResource state={state} skeletonRows={3}>
      {tiers => <ServiceTierEditor initialTiers={tiers} />}
    </AdminResource>
  );
}
