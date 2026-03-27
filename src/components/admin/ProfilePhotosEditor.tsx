'use client';

import { useState, useRef, useEffect } from 'react';

const SLOTS = [
  { key: 'photo_default_url', label: 'Default Photo',   hint: 'Light mode · idle' },
  { key: 'photo_hover_url',   label: 'Hover Photo',     hint: 'Revealed on hover' },
  { key: 'photo_dark_url',    label: 'Dark Mode Photo', hint: 'Dark mode · idle' },
] as const;

type SlotKey = typeof SLOTS[number]['key'];

export default function ProfilePhotosEditor() {
  const [photos, setPhotos]   = useState<Record<SlotKey, string>>({
    photo_default_url: '/profile-photo2.png',
    photo_hover_url:   '/square-profile-photo.jpeg',
    photo_dark_url:    '/profile-photo2.png',
  });
  const [uploading, setUploading] = useState<SlotKey | null>(null);
  const [status, setStatus]       = useState<'idle' | 'saved' | 'error'>('idle');
  const inputRefs = useRef<Partial<Record<SlotKey, HTMLInputElement | null>>>({});

  useEffect(() => {
    fetch('/api/admin/content/hero')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setPhotos(prev => ({
          photo_default_url: data.photo_default_url || prev.photo_default_url,
          photo_hover_url:   data.photo_hover_url   || prev.photo_hover_url,
          photo_dark_url:    data.photo_dark_url     || prev.photo_dark_url,
        }));
      })
      .catch(() => {});
  }, []);

  const handleFileChange = async (key: SlotKey, file: File) => {
    setUploading(key);
    setStatus('idle');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('label', `profile_${key}_${Date.now()}`);

      const uploadRes = await fetch('/api/admin/images', { method: 'POST', body: form });
      if (!uploadRes.ok) {
        const data = await uploadRes.json() as { error?: string };
        throw new Error(data.error ?? 'Upload failed');
      }
      const { url } = await uploadRes.json() as { url: string };

      const patchRes = await fetch('/api/admin/content/hero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { [key]: url } }),
      });
      if (!patchRes.ok) throw new Error('Save failed');

      setPhotos(prev => ({ ...prev, [key]: url }));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    } finally {
      setUploading(null);
      const el = inputRefs.current[key];
      if (el) el.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Profile Photos</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Three slots — default (light), hover wipe, and dark mode. Changes go live immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {SLOTS.map(({ key, label, hint }) => {
          const url = photos[key];
          const isUploading = uploading === key;

          return (
            <div key={key} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {label}
              </p>
              <p className="text-xs text-gray-400">{hint}</p>

              {/* Preview */}
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={label}
                    className="w-full h-full object-cover object-center"
                  />
                )}
              </div>

              {/* Upload trigger */}
              <label
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isUploading
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed pointer-events-none'
                    : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200'
                }`}
              >
                {isUploading ? 'Uploading…' : 'Change'}
                <input
                  ref={el => { inputRefs.current[key] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={!!uploading}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(key, file);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      {status === 'saved' && (
        <p className="text-sm text-green-600 dark:text-green-400">Photo updated.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">Upload failed — try again.</p>
      )}
    </div>
  );
}
