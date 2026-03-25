'use client';

import { useRef, useState } from 'react';

interface Props {
  section: string;
  initialFields: Record<string, string>;
}

const BODY_KEYS = ['body', 'description', 'bio'];

function isBodyField(key: string) {
  return BODY_KEYS.includes(key) || key.endsWith('_body') || key.endsWith('_description');
}

function isLongField(value: string) {
  return value.length > 80 || value.includes('\n');
}

interface ToolbarProps {
  fieldKey: string;
  onInsert: (before: string, after: string) => void;
}

function FormatToolbar({ fieldKey, onInsert }: ToolbarProps) {
  const btns = [
    { label: 'B',      title: 'Bold',           before: '**',   after: '**',     cls: 'font-bold' },
    { label: 'I',      title: 'Italic',          before: '_',    after: '_',      cls: 'italic' },
    { label: 'H2',     title: 'Heading 2',       before: '\n## ', after: '',      cls: 'font-semibold' },
    { label: 'Link',   title: 'Insert link',     before: '[',    after: '](url)', cls: '' },
    { label: '• List', title: 'Bullet list',     before: '\n- ', after: '',       cls: '' },
    { label: '1. List',title: 'Numbered list',   before: '\n1. ', after: '',      cls: '' },
    { label: '❝',      title: 'Blockquote',      before: '\n> ', after: '',       cls: '' },
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
      <span className="ml-2 text-[10px] text-gray-400">Markdown supported</span>
    </div>
  );
}

export default function ContentEditor({ section, initialFields }: Props) {
  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

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

  const insertFormat = (key: string, before: string, after: string) => {
    const el = textareaRefs.current[key];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = fields[key] ?? '';
    const selected = val.slice(start, end);
    const newVal = val.slice(0, start) + before + selected + after + val.slice(end);
    setFields(prev => ({ ...prev, [key]: newVal }));
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length + after.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-5">
      {Object.entries(fields).map(([key, value]) => {
        const isBody = isBodyField(key);
        const isLong = isLongField(value);
        return (
          <div key={key} className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {key.replace(/_/g, ' ')}
            </label>
            {isBody && (
              <FormatToolbar fieldKey={key} onInsert={(b, a) => insertFormat(key, b, a)} />
            )}
            {isBody || isLong ? (
              <textarea
                ref={el => { textareaRefs.current[key] = el; }}
                rows={isBody ? 6 : 4}
                value={value}
                onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y font-mono"
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
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
        {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Save failed</span>}
      </div>
    </div>
  );
}
