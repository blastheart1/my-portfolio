'use client';

import * as React from 'react';
import { KeyRound, Trash2 } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import type { CredentialStatus } from '@/lib/credentials-store';

/**
 * Provider API keys.
 *
 * A key can be set and cleared here, never read back. The input clears on save
 * rather than showing the stored value, because there is nothing to show: the
 * server has no endpoint that returns one. That is the point, not a limitation
 * to work around.
 */

const SOURCE_COPY: Record<CredentialStatus['source'], string> = {
  database: 'Set here',
  environment: 'From environment',
  missing: 'Not configured',
};

export default function CredentialsEditor() {
  const toast = useToast();
  const [statuses, setStatuses] = React.useState<CredentialStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/credentials');
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = (await res.json()) as { credentials?: CredentialStatus[] };
      // Never assume the shape: an error body reaching .map() blanks the page.
      setStatuses(Array.isArray(body.credentials) ? body.credentials : []);
    } catch {
      setStatuses([]);
      toast.error('Could not load credentials');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async (provider: string) => {
    const key = (drafts[provider] ?? '').trim();
    if (key.length < 8) {
      toast.error('That key looks too short');
      return;
    }

    setBusy(provider);
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Save failed (${res.status})`);

      // Drop the plaintext from component state the moment it is stored.
      setDrafts(prev => ({ ...prev, [provider]: '' }));
      await load();
      toast.success('Key saved');
    } catch (err) {
      toast.error('Could not save the key', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const clear = async (provider: string, label: string) => {
    if (!confirm(`Clear the ${label} key? Resolution falls back to the environment variable.`)) {
      return;
    }

    setBusy(provider);
    try {
      const res = await fetch(`/api/admin/credentials?provider=${encodeURIComponent(provider)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Clear failed (${res.status})`);
      await load();
      toast.success('Key cleared');
    } catch (err) {
      toast.error('Could not clear the key', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Keys are encrypted before they are stored and cannot be read back — only replaced or
        cleared. A key set here overrides the matching environment variable; clearing it falls
        back to that variable.
      </p>

      {statuses.map(status => (
        <section key={status.provider} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">{status.label}</h2>
            </div>

            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                status.source === 'missing'
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              {SOURCE_COPY[status.source]}
              {status.last4 ? ` ••••${status.last4}` : ''}
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Falls back to <code>{status.envVar}</code>
            {status.updatedAt ? ` · updated ${new Date(status.updatedAt).toLocaleDateString()}` : ''}
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[16rem] flex-1">
              <Label htmlFor={`key-${status.provider}`} className="sr-only">
                {status.label} API key
              </Label>
              <input
                id={`key-${status.provider}`}
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={status.source === 'database' ? 'Replace key…' : 'Paste key…'}
                value={drafts[status.provider] ?? ''}
                onChange={e =>
                  setDrafts(prev => ({ ...prev, [status.provider]: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <button
              type="button"
              onClick={() => void save(status.provider)}
              disabled={busy === status.provider || (drafts[status.provider] ?? '').length < 8}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium
                         transition-colors hover:bg-secondary disabled:opacity-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {busy === status.provider ? 'Saving…' : 'Save'}
            </button>

            {status.source === 'database' && (
              <button
                type="button"
                onClick={() => void clear(status.provider, status.label)}
                disabled={busy === status.provider}
                aria-label={`Clear the ${status.label} key`}
                className="rounded-lg border border-border p-2 text-muted-foreground
                           transition-colors hover:bg-secondary hover:text-destructive
                           disabled:opacity-50 focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
