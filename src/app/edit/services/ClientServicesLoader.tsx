'use client';

import { useEffect, useState } from 'react';
import ServiceTierEditor, { type ServiceTier } from '@/components/admin/ServiceTierEditor';

export default function ClientServicesLoader() {
  const [tiers, setTiers] = useState<ServiceTier[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/services')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setTiers(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load service tiers. Check your database connection.'));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (tiers === null) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  return <ServiceTierEditor initialTiers={tiers} />;
}
