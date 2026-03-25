'use client';

import { useEffect, useState } from 'react';
import ExperienceEditor from '@/components/admin/ExperienceEditor';

export default function ClientExperienceLoader() {
  const [entries, setEntries] = useState<Parameters<typeof ExperienceEditor>[0]['initialEntries'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/experience')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (entries === null) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  return <ExperienceEditor initialEntries={entries} />;
}
