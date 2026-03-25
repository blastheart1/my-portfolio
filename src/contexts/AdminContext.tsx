'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Section {
  id: string;
  label: string;
  visible: boolean;
  sort_order: number;
}

interface AdminContextValue {
  sections: Section[];
  setSections: (sections: Section[]) => void;
  toggleSection: (id: string, visible: boolean) => Promise<void>;
  reorderSections: (order: string[]) => Promise<void>;
  saving: boolean;
  error: string | null;
  clearError: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const toggleSection = useCallback(async (id: string, visible: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: id, visible }),
      });
      if (!res.ok) throw new Error('Failed to update section');
      setSections(prev =>
        prev.map(s => (s.id === id ? { ...s, visible } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, []);

  const reorderSections = useCallback(async (order: string[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error('Failed to reorder sections');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <AdminContext.Provider value={{ sections, setSections, toggleSection, reorderSections, saving, error, clearError }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
