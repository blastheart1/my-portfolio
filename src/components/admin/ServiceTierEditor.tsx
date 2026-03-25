'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceTier {
  id: string;
  name: string;
  tagline: string;
  outcome: string;
  price_php: number;
  price_usd: number;
  features: string[];
  is_popular: boolean;
  visible: boolean;
  sort_order: number;
}

// ─── Limits ───────────────────────────────────────────────────────────────────

const LIMITS = {
  name:       50,
  tagline:    80,
  outcome:    300,
  feature:    100,
  maxFeatures: 8,
};

// ─── CharCounter ──────────────────────────────────────────────────────────────

function CharCounter({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  const pct = value.length / max;
  const cls = pct >= 1 ? 'text-red-500' : pct >= 0.85 ? 'text-amber-500' : 'text-gray-400';
  return (
    <span className={`text-[10px] tabular-nums ${cls}`}>
      {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}
    </span>
  );
}

// ─── FormatToolbar ────────────────────────────────────────────────────────────

interface ToolbarProps {
  onInsert: (before: string, after: string) => void;
}

function FormatToolbar({ onInsert }: ToolbarProps) {
  const btns = [
    { label: 'B',    title: 'Bold',        before: '**', after: '**', cls: 'font-bold' },
    { label: 'I',    title: 'Italic',      before: '_',  after: '_',  cls: 'italic' },
    { label: 'Link', title: 'Insert link', before: '[',  after: '](url)', cls: '' },
  ];
  return (
    <div className="flex items-center gap-1 mb-1">
      {btns.map(b => (
        <button
          key={b.label}
          type="button"
          title={b.title}
          onClick={() => onInsert(b.before, b.after)}
          className={`px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${b.cls}`}
        >
          {b.label}
        </button>
      ))}
      <span className="ml-1 text-[10px] text-gray-400">Markdown</span>
    </div>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
      {children}
    </label>
  );
}

// ─── TierCard ─────────────────────────────────────────────────────────────────

interface TierCardProps {
  tier: ServiceTier;
  onSave: (id: string, data: Partial<ServiceTier>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TierCard({ tier, onSave, onDelete }: TierCardProps) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState<ServiceTier>({ ...tier });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus]   = useState<'idle' | 'saved' | 'error'>('idle');
  const taglineRef  = useRef<HTMLInputElement>(null);
  const outcomeRef  = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof ServiceTier>(key: K, val: ServiceTier[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // Insert markdown around selection
  const insertInto = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    field: 'tagline' | 'outcome',
    before: string,
    after: string
  ) => {
    const el = ref.current;
    if (!el) return;
    const start  = el.selectionStart ?? 0;
    const end    = el.selectionEnd   ?? 0;
    const val    = form[field];
    const selected = val.slice(start, end);
    const newVal = val.slice(0, start) + before + selected + after + val.slice(end);
    set(field, newVal);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length + after.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const addFeature = () => {
    if (form.features.length >= LIMITS.maxFeatures) return;
    set('features', [...form.features, '']);
  };

  const setFeature = (idx: number, val: string) => {
    const next = [...form.features];
    next[idx] = val.slice(0, LIMITS.feature);
    set('features', next);
  };

  const removeFeature = (idx: number) => {
    set('features', form.features.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await onSave(tier.id, form);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${tier.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(tier.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className={`rounded-xl border ${form.is_popular ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 overflow-hidden`}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {form.is_popular && <Star className="w-4 h-4 text-blue-500 fill-blue-500 flex-shrink-0" />}
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{form.name || 'Unnamed tier'}</span>
            {form.tagline && (
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{form.tagline}</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ₱{form.price_php.toLocaleString()} / ${form.price_usd}
            </span>
            {!form.visible && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">hidden</span>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 space-y-5 pt-4">

          {/* Row: name + popular + visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <FieldLabel>Tier Name</FieldLabel>
                <CharCounter value={form.name} max={LIMITS.name} />
              </div>
              <input
                type="text"
                value={form.name}
                maxLength={LIMITS.name}
                onChange={e => set('name', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-6 pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_popular}
                  onChange={e => set('is_popular', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mark as popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={e => set('visible', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Visible</span>
              </label>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Tagline</FieldLabel>
              <CharCounter value={form.tagline} max={LIMITS.tagline} />
            </div>
            <FormatToolbar onInsert={(b, a) => insertInto(taglineRef, 'tagline', b, a)} />
            <input
              ref={taglineRef}
              type="text"
              value={form.tagline}
              maxLength={LIMITS.tagline}
              onChange={e => set('tagline', e.target.value)}
              placeholder="e.g. Launch fast, look sharp"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Outcome */}
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Outcome / Description</FieldLabel>
              <CharCounter value={form.outcome} max={LIMITS.outcome} />
            </div>
            <FormatToolbar onInsert={(b, a) => insertInto(outcomeRef, 'outcome', b, a)} />
            <textarea
              ref={outcomeRef}
              rows={3}
              value={form.outcome}
              maxLength={LIMITS.outcome}
              onChange={e => set('outcome', e.target.value)}
              placeholder="What the client gets out of this tier"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y font-mono"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Price (PHP ₱)</FieldLabel>
              <input
                type="number"
                min={0}
                value={form.price_php}
                onChange={e => set('price_php', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <FieldLabel>Price (USD $)</FieldLabel>
              <input
                type="number"
                min={0}
                value={form.price_usd}
                onChange={e => set('price_usd', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Features ({form.features.length}/{LIMITS.maxFeatures})</FieldLabel>
              {form.features.length < LIMITS.maxFeatures && (
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            <div className="space-y-2">
              {form.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500 text-xs w-4 text-right flex-shrink-0">{idx + 1}</span>
                  <input
                    type="text"
                    value={feat}
                    maxLength={LIMITS.feature}
                    onChange={e => setFeature(idx, e.target.value)}
                    placeholder={`Feature ${idx + 1}`}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <CharCounter value={feat} max={LIMITS.feature} />
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Remove feature"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {form.features.length === 0 && (
                <p className="text-xs text-gray-400 italic">No features yet. Click Add.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Deleting…' : 'Delete tier'}
            </button>
            <div className="flex items-center gap-3">
              {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
              {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Save failed</span>}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

interface Props {
  initialTiers: ServiceTier[];
}

export default function ServiceTierEditor({ initialTiers }: Props) {
  const [tiers, setTiers] = useState<ServiceTier[]>(initialTiers);
  const [adding, setAdding] = useState(false);

  const handleSave = async (id: string, data: Partial<ServiceTier>) => {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Save failed');
    const updated: ServiceTier = await res.json();
    setTiers(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    setTiers(prev => prev.filter(t => t.id !== id));
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Tier',
          tagline: '',
          outcome: '',
          price_php: 0,
          price_usd: 0,
          features: [],
          is_popular: false,
          visible: true,
          sort_order: tiers.length,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      const created: ServiceTier = await res.json();
      setTiers(prev => [...prev, created]);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {tiers.map(tier => (
        <TierCard
          key={tier.id}
          tier={tier}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ))}

      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 py-4 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {adding ? 'Creating…' : 'Add new tier'}
      </button>
    </div>
  );
}
