'use client';

import { useEffect, useState } from 'react';
import ContentEditor from '@/components/admin/ContentEditor';

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

  return <ContentEditor section={section} initialFields={fields} />;
}
