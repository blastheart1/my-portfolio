'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ContentEditor from '@/components/admin/ContentEditor';

// Sections that have a dedicated full editor elsewhere
const DEDICATED_EDITORS: Record<string, { href: string; label: string }> = {
  services:   { href: '/edit/services',   label: 'Edit service tiers (pricing, features) →' },
  experience: { href: '/edit/experience', label: 'Edit experience entries →' },
};

interface Props {
  section: string;
}

export default function ClientContentEditor({ section }: Props) {
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFields(null);
    setError(null);
    fetch(`/api/admin/content/${section}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setFields(data && typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(() => setFields({}));
  }, [section]);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (fields === null) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;
  }

  if (Object.keys(fields).length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No content fields found for <strong>{section}</strong>. Run the seed script to populate initial values.
      </p>
    );
  }

  const dedicated = DEDICATED_EDITORS[section];

  return (
    <div className="space-y-4">
      {dedicated && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This page edits the section heading only.{' '}
            <Link href={dedicated.href} className="font-medium underline hover:no-underline">
              {dedicated.label}
            </Link>
          </p>
        </div>
      )}
      <ContentEditor section={section} initialFields={fields} />
    </div>
  );
}
