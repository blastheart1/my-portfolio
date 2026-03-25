'use client';

import { useState } from 'react';

interface Props {
  section: string;
  initialFields: Record<string, string>;
}

export default function ContentEditor({ section, initialFields }: Props) {
  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch(`/api/admin/content/${section}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {key.replace(/_/g, ' ')}
          </label>
          {value.length > 80 || value.includes('\n') ? (
            <textarea
              rows={4}
              value={value}
              onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {status === 'saved' && (
          <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-600 dark:text-red-400">Save failed</span>
        )}
      </div>
    </div>
  );
}
