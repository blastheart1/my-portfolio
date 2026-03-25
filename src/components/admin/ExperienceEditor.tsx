'use client';

import { useState } from 'react';

interface Entry {
  id: string;
  track: string;
  role: string;
  company: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  sort_order: number;
  visible: boolean;
  detail_body: string | null;
}

interface Props {
  initialEntries: Entry[];
}

const EMPTY: Omit<Entry, 'id' | 'sort_order'> = {
  track: 'main',
  role: '',
  company: '',
  description: '',
  start_date: '',
  end_date: null,
  visible: true,
  detail_body: '',
};

export default function ExperienceEditor({ initialEntries }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Entry, 'id' | 'sort_order'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEdit = (entry: Entry) => {
    setForm({
      track: entry.track,
      role: entry.role,
      company: entry.company,
      description: entry.description ?? '',
      start_date: entry.start_date,
      end_date: entry.end_date ?? '',
      visible: entry.visible,
      detail_body: entry.detail_body ?? '',
    });
    setEditing(entry.id);
    setError(null);
  };

  const openNew = () => {
    setForm(EMPTY);
    setEditing('new');
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      description: form.description || undefined,
      end_date: form.end_date || null,
      detail_body: form.detail_body || undefined,
    };

    try {
      if (editing === 'new') {
        const res = await fetch('/api/admin/experience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create entry');
        const created: Entry = await res.json();
        setEntries(prev => [created, ...prev]);
      } else {
        const res = await fetch(`/api/admin/experience/${editing}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update entry');
        const updated: Entry = await res.json();
        setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const res = await fetch(`/api/admin/experience/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editing === id) setEditing(null);
    } catch {
      setError('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Experience entries</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add entry
        </button>
      </div>

      {/* Form panel */}
      {editing !== null && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {editing === 'new' ? 'New entry' : 'Edit entry'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Track">
              <select
                value={form.track}
                onChange={e => setForm(p => ({ ...p, track: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="main">Main</option>
                <option value="freelance">Freelance</option>
                <option value="volunteer">Volunteer</option>
                <option value="education">Education</option>
              </select>
            </Field>
            <Field label="Role">
              <input
                type="text"
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="Start date (YYYY-MM-DD)">
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="End date (leave blank if current)">
              <input
                type="date"
                value={form.end_date ?? ''}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value || null }))}
                className="input-field"
              />
            </Field>
            <Field label="Visible">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={e => setForm(p => ({ ...p, visible: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show on site</span>
              </label>
            </Field>
          </div>

          <Field label="Description (short)">
            <textarea
              rows={2}
              value={form.description ?? ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          </Field>

          <Field label="Detail body (markdown)">
            <textarea
              rows={5}
              value={form.detail_body ?? ''}
              onChange={e => setForm(p => ({ ...p, detail_body: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y font-mono"
            />
          </Field>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
          >
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              entry.track === 'main' ? 'bg-blue-100 text-blue-700' :
              entry.track === 'freelance' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {entry.track}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {entry.role} — {entry.company}
              </p>
              <p className="text-xs text-gray-500">
                {entry.start_date} → {entry.end_date ?? 'present'}
              </p>
            </div>
            {!entry.visible && (
              <span className="text-xs text-gray-400">hidden</span>
            )}
            <button
              onClick={() => openEdit(entry)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Delete
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No entries yet.</p>
        )}
      </div>

      <style>{`
        .input-field {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(209 213 219);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .dark .input-field {
          border-color: rgb(75 85 99);
          background: rgb(31 41 55);
          color: rgb(243 244 246);
        }
        .input-field:focus {
          box-shadow: 0 0 0 2px rgb(59 130 246);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}
