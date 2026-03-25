'use client';

import { useState, useRef } from 'react';

interface Asset {
  id: string;
  label: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

interface Props {
  initialAssets: Asset[];
}

export default function ImageUploader({ initialAssets }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append('file', file);
    form.append('label', file.name.replace(/\.[^.]+$/, ''));

    try {
      const res = await fetch('/api/admin/images', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Upload failed');
      }
      const asset: Asset = await res.json();
      setAssets(prev => [asset, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      const res = await fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch {
      setError('Delete failed');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          {uploading ? 'Uploading…' : 'Upload image'}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        <span className="text-xs text-gray-500">JPEG, PNG, WebP, GIF, SVG · max 5 MB</span>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {assets.map(asset => (
          <div key={asset.id} className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt={asset.label}
              className="w-full aspect-square object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
              <p className="text-white text-xs text-center truncate w-full">{asset.label}</p>
              <button
                onClick={() => copyUrl(asset.url)}
                className="text-xs bg-white/20 hover:bg-white/40 text-white px-2 py-1 rounded transition-colors"
              >
                Copy URL
              </button>
              <button
                onClick={() => handleDelete(asset.id)}
                className="text-xs bg-red-500/80 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <p className="col-span-full text-sm text-gray-500 text-center py-8">No images uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
