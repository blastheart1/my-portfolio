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

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>(FALLBACK_SECTIONS);
  const [saving, setSaving] = useState(false);

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
    }).catch(() => {/* no-op when DB not set up */});
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sections</h1>
        <p className="mt-1 text-sm text-gray-500">Toggle which sections appear on your portfolio.</p>
        {saving && <p className="text-xs text-gray-400 mt-1 animate-pulse">Saving…</p>}
      </div>

      <div className="space-y-2">
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
