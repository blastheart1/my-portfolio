'use client';

import { useEffect, useState } from 'react';
import SectionToggle from '@/components/admin/SectionToggle';

interface Section {
  id: string;
  label: string;
  visible: boolean;
  sort_order: number;
}

const FALLBACK_SECTIONS: Section[] = [
  { id: 'hero',       label: 'Hero',       visible: true, sort_order: 0 },
  { id: 'about',      label: 'About',      visible: true, sort_order: 1 },
  { id: 'experience', label: 'Experience', visible: true, sort_order: 2 },
  { id: 'skills',     label: 'Skills',     visible: true, sort_order: 3 },
  { id: 'projects',   label: 'Projects',   visible: true, sort_order: 4 },
  { id: 'services',   label: 'Services',   visible: true, sort_order: 5 },
  { id: 'blog',       label: 'Blog',       visible: true, sort_order: 6 },
  { id: 'contact',    label: 'Contact',    visible: true, sort_order: 7 },
];

function SplashToggle() {
  const [enabled, setEnabled]   = useState<boolean | null>(null);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        // default true if not set
        setEnabled(data?.splash_enabled !== 'false');
      })
      .catch(() => setEnabled(true));
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    setStatus('idle');
    setEnabled(next);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'splash_enabled', value: String(next) }),
      });
      if (!res.ok) throw new Error();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setEnabled(!next); // revert optimistic
    } finally {
      setSaving(false);
    }
  };

  if (enabled === null) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">GSAP Splash Screen</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Full-screen animated intro shown once per visitor.
            {!enabled && <span className="ml-1 text-amber-500">Visitors skip straight to portfolio.</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
          {status === 'error' && <span className="text-xs text-red-500">Failed</span>}
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
              enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-pressed={enabled}
            aria-label="Toggle GSAP splash screen"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>(FALLBACK_SECTIONS);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch('/api/admin/sections')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setSections(data); })
      .catch(() => {/* keep fallback */});
  }, []);

  const toggle = async (id: string, visible: boolean) => {
    setSaving(true);
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible } : s));
    await fetch('/api/admin/sections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: id, visible }),
    }).catch(() => {});
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sections</h1>
        <p className="mt-1 text-sm text-gray-500">Toggle which sections appear on your portfolio.</p>
        {saving && <p className="text-xs text-gray-400 mt-1 animate-pulse">Saving…</p>}
      </div>

      {/* Site-level settings */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Site Settings</p>
        <SplashToggle />
      </div>

      {/* Section visibility */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Page Sections</p>
        {sections.map(section => (
          <SectionToggle
            key={section.id}
            id={section.id}
            label={section.label}
            visible={section.visible}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}
