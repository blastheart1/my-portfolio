'use client';

import { useState } from 'react';

interface Project {
  id: string;
  title: string;
  description: string | null;
  tech: string[];
  link: string | null;
  image_url: string | null;
  sort_order: number;
  visible: boolean;
}

interface Props {
  initialProjects: Project[];
}

const EMPTY: Omit<Project, 'id' | 'sort_order'> = {
  title: '',
  description: '',
  tech: [],
  link: '',
  image_url: '',
  visible: true,
};

export default function ProjectsEditor({ initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Project, 'id' | 'sort_order'>>(EMPTY);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEdit = (p: Project) => {
    setForm({
      title: p.title,
      description: p.description ?? '',
      tech: p.tech ?? [],
      link: p.link ?? '',
      image_url: p.image_url ?? '',
      visible: p.visible,
    });
    setTechInput((p.tech ?? []).join(', '));
    setEditing(p.id);
    setError(null);
  };

  const openNew = () => {
    setForm(EMPTY);
    setTechInput('');
    setEditing('new');
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const techArray = techInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      ...form,
      tech: techArray,
      description: form.description || undefined,
      link: form.link || null,
      image_url: form.image_url || null,
    };

    try {
      if (editing === 'new') {
        const res = await fetch('/api/admin/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create project');
        const created: Project = await res.json();
        setProjects(prev => [...prev, created]);
      } else {
        const res = await fetch(`/api/admin/projects/${editing}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update project');
        const updated: Project = await res.json();
        setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setProjects(prev => prev.filter(p => p.id !== id));
      if (editing === id) setEditing(null);
    } catch {
      setError('Delete failed');
    }
  };

  const handleToggleVisible = async (p: Project) => {
    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !p.visible }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated: Project = await res.json();
      setProjects(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch {
      setError('Toggle failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Projects</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add project
        </button>
      </div>

      {/* Form panel */}
      {editing !== null && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {editing === 'new' ? 'New project' : 'Edit project'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="Link (URL)">
              <input
                type="text"
                value={form.link ?? ''}
                onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
                placeholder="https://..."
                className="input-field"
              />
            </Field>
            <Field label="Image URL (optional)">
              <input
                type="text"
                value={form.image_url ?? ''}
                onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
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

          <Field label="Tech stack (comma-separated)">
            <input
              type="text"
              value={techInput}
              onChange={e => setTechInput(e.target.value)}
              placeholder="React, TypeScript, Next.js"
              className="input-field"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
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

      {/* Projects list */}
      <div className="space-y-2">
        {projects.map(p => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
              {p.link && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline truncate block"
                >
                  {p.link}
                </a>
              )}
              {p.tech && p.tech.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.tech.join(', ')}</p>
              )}
            </div>
            <button
              onClick={() => handleToggleVisible(p)}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                p.visible
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {p.visible ? 'visible' : 'hidden'}
            </button>
            <button
              onClick={() => openEdit(p)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Delete
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No projects yet.</p>
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
