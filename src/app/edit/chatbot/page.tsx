'use client';

import { useEffect, useState, useCallback } from 'react';
import { PROVIDER_MODELS, type AIProviderName } from '@/lib/chatbot/aiProviders';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIConfig {
  id: string;
  provider: AIProviderName;
  model: string;
  temperature: number;
  max_tokens: number;
  use_knowledge: boolean;
  system_prompt_override: string | null;
  active: boolean;
}

interface ChatExample {
  id: string;
  user_input: string;
  ai_response: string;
  tag: string;
  approved: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  source?: string;
}

interface Conversation {
  id: string;
  session_id: string;
  messages: ChatMessage[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

// ─── AI Config Tab ────────────────────────────────────────────────────────────

function AIConfigTab() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<AIConfig>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chatbot/config');
      const data = await res.json() as AIConfig[];
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activate = async (id: string) => {
    setActivating(id);
    try {
      await fetch('/api/admin/chatbot/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await load();
    } finally {
      setActivating(null);
    }
  };

  const startEdit = (cfg: AIConfig) => {
    setEditing(cfg.id);
    setEditDraft({
      temperature: cfg.temperature,
      max_tokens: cfg.max_tokens,
      use_knowledge: cfg.use_knowledge,
      system_prompt_override: cfg.system_prompt_override ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    setSaveStatus(s => ({ ...s, [id]: 'saving' }));
    try {
      await fetch('/api/admin/chatbot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          temperature: Number(editDraft.temperature),
          max_tokens: Number(editDraft.max_tokens),
          use_knowledge: editDraft.use_knowledge,
          system_prompt_override: editDraft.system_prompt_override || null,
        }),
      });
      setSaveStatus(s => ({ ...s, [id]: 'saved' }));
      setTimeout(() => setSaveStatus(s => ({ ...s, [id]: 'idle' })), 2000);
      setEditing(null);
      await load();
    } catch {
      setSaveStatus(s => ({ ...s, [id]: 'error' }));
    }
  };

  const providerBadge = (p: AIProviderName) =>
    p === 'claude'
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

  if (loading) return <p className="text-sm text-gray-500">Loading configs…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        One config is active at a time. Click <strong>Activate</strong> to switch providers.
        API keys are set via environment variables (<code>OPENAI_API_KEY</code> / <code>ANTHROPIC_API_KEY</code>).
      </p>

      {configs.map(cfg => {
        const isEditing = editing === cfg.id;
        const models = PROVIDER_MODELS[cfg.provider];
        const modelLabel = models.find(m => m.value === cfg.model)?.label ?? cfg.model;

        return (
          <div
            key={cfg.id}
            className={`rounded-xl border p-4 space-y-3 transition-all ${
              cfg.active
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
            }`}
          >
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${providerBadge(cfg.provider)}`}>
                {cfg.provider.toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{modelLabel}</span>
              {cfg.active && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded bg-blue-600 text-white">
                  ● ACTIVE
                </span>
              )}
            </div>

            {/* Params row */}
            {!isEditing && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <span>Temp: <strong>{cfg.temperature}</strong></span>
                <span>Max tokens: <strong>{cfg.max_tokens}</strong></span>
                <span>Knowledge: <strong>{cfg.use_knowledge ? 'on' : 'off'}</strong></span>
                {cfg.system_prompt_override && (
                  <span className="text-amber-600">Custom system prompt set</span>
                )}
              </div>
            )}

            {/* Edit form */}
            {isEditing && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Temperature (0–1)</label>
                    <input
                      type="number" min={0} max={2} step={0.05}
                      value={editDraft.temperature ?? 0.7}
                      onChange={e => setEditDraft(d => ({ ...d, temperature: parseFloat(e.target.value) }))}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Max tokens</label>
                    <input
                      type="number" min={50} max={4000} step={50}
                      value={editDraft.max_tokens ?? 300}
                      onChange={e => setEditDraft(d => ({ ...d, max_tokens: parseInt(e.target.value) }))}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editDraft.use_knowledge ?? true}
                    onChange={e => setEditDraft(d => ({ ...d, use_knowledge: e.target.checked }))}
                  />
                  Inject knowledge from <code>/knowledge/*.md</code>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    System prompt override <span className="text-gray-400">(optional — replaces knowledge context)</span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Leave empty to use /knowledge/*.md files…"
                    value={editDraft.system_prompt_override ?? ''}
                    onChange={e => setEditDraft(d => ({ ...d, system_prompt_override: e.target.value }))}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm font-mono resize-y"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!cfg.active && (
                <button
                  onClick={() => activate(cfg.id)}
                  disabled={activating === cfg.id}
                  className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {activating === cfg.id ? 'Activating…' : 'Activate'}
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => startEdit(cfg)}
                  className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Edit params
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => saveEdit(cfg.id)}
                    disabled={saveStatus[cfg.id] === 'saving'}
                    className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saveStatus[cfg.id] === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              {saveStatus[cfg.id] === 'saved' && <span className="text-xs text-green-600">Saved ✓</span>}
              {saveStatus[cfg.id] === 'error' && <span className="text-xs text-red-600">Save failed</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Examples Tab ─────────────────────────────────────────────────────────────

function ExamplesTab() {
  const [examples, setExamples] = useState<ChatExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/chatbot/examples');
      setExamples(await res.json() as ChatExample[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setApproved = async (id: string, approved: boolean) => {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await fetch(`/api/chatbot/examples/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      setExamples(ex => ex.map(e => e.id === id ? { ...e, approved } : e));
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  };

  const deleteExample = async (id: string) => {
    if (!confirm('Delete this learned example?')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await fetch(`/api/chatbot/examples/${id}`, { method: 'DELETE' });
      setExamples(ex => ex.filter(e => e.id !== id));
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  };

  const filtered = examples.filter(e => {
    if (filter === 'approved') return e.approved;
    if (filter === 'pending') return !e.approved;
    return true;
  });

  const pendingCount = examples.filter(e => !e.approved).length;

  if (loading) return <p className="text-sm text-gray-500">Loading examples…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {examples.length} total — {pendingCount} awaiting approval.
          Approved examples are merged into TF.js training on next init.
        </p>
        <div className="flex gap-1 ml-auto">
          {(['all', 'approved', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 italic">No examples found.</p>
      )}

      <div className="space-y-3">
        {filtered.map(ex => (
          <div
            key={ex.id}
            className={`rounded-lg border p-3 space-y-2 text-sm ${
              ex.approved
                ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`shrink-0 px-1.5 py-0.5 text-xs rounded font-semibold ${
                ex.approved
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
              }`}>
                {ex.approved ? '✓ Approved' : '⏳ Pending'}
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(ex.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">User asked:</span>
              <p className="text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-2">{ex.user_input}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">AI replied:</span>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-3">{ex.ai_response}</p>
            </div>
            <div className="flex gap-2 pt-1">
              {!ex.approved ? (
                <button
                  onClick={() => setApproved(ex.id, true)}
                  disabled={busy[ex.id]}
                  className="px-2 py-0.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {busy[ex.id] ? '…' : '✓ Approve'}
                </button>
              ) : (
                <button
                  onClick={() => setApproved(ex.id, false)}
                  disabled={busy[ex.id]}
                  className="px-2 py-0.5 text-xs rounded border border-amber-400 text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                >
                  {busy[ex.id] ? '…' : 'Unapprove'}
                </button>
              )}
              <button
                onClick={() => deleteExample(ex.id)}
                disabled={busy[ex.id]}
                className="px-2 py-0.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Conversations Tab ────────────────────────────────────────────────────────

function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/chatbot/conversations');
        setConversations(await res.json() as Conversation[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading conversations…</p>;
  if (conversations.length === 0) return <p className="text-sm text-gray-400 italic">No logged conversations yet.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Only sessions where the user accepted the consent prompt are logged.
      </p>
      {conversations.map(conv => (
        <div
          key={conv.id}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          <button
            onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="font-mono text-xs text-gray-500 truncate max-w-[180px]">{conv.session_id}</span>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{conv.message_count ?? conv.messages.length} messages</span>
              <span>{new Date(conv.updated_at).toLocaleString()}</span>
              <span>{expanded === conv.id ? '▲' : '▼'}</span>
            </div>
          </button>

          {expanded === conv.id && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
              {conv.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs px-2 py-1 rounded max-w-[85%] ${
                    msg.isUser
                      ? 'ml-auto bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <span className="font-semibold">{msg.isUser ? 'User' : 'Bot'}: </span>
                  {msg.content.slice(0, 200)}{msg.content.length > 200 ? '…' : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'config' | 'examples' | 'conversations';

export default function ChatbotAdminPage() {
  const [tab, setTab] = useState<Tab>('config');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'config',        label: 'AI Config' },
    { id: 'examples',      label: 'Learned Examples' },
    { id: 'conversations', label: 'Conversations' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Chatbot</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure AI providers, review learned examples, and browse conversation logs.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div>
        {tab === 'config'        && <AIConfigTab />}
        {tab === 'examples'      && <ExamplesTab />}
        {tab === 'conversations' && <ConversationsTab />}
      </div>
    </div>
  );
}
