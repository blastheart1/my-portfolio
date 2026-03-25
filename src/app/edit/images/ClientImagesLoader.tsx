'use client';

import { useEffect, useState } from 'react';
import ImageUploader from '@/components/admin/ImageUploader';

export default function ClientImagesLoader() {
  const [assets, setAssets] = useState<Parameters<typeof ImageUploader>[0]['initialAssets'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/images')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setAssets([]));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (assets === null) return <p className="text-sm text-gray-400 animate-pulse">Loading…</p>;

  return <ImageUploader initialAssets={assets} />;
}
