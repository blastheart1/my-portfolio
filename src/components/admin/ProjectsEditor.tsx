'use client';

import * as React from 'react';
import { FolderKanban, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { FIELD_LIMITS } from '@/lib/schemas';
import { useReorder } from '@/hooks/useReorder';
import { useDirtyGuard } from '@/hooks/useDirtyGuard';
import { cn } from '@/lib/utils';

import EmptyState from './EmptyState';
import FieldMeta from './FieldMeta';
import { RecordList, RecordRow } from './RecordList';

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

type Draft = Omit<Project, 'id' | 'sort_order'>;

const EMPTY: Draft = {
  title: '',
  description: '',
  tech: [],
  link: '',
  image_url: '',
  visible: true,
};

const LIMITS = FIELD_LIMITS.project;

/** Server field errors keyed by field name, from zod's flatten(). */
type FieldErrors = Partial<Record<keyof Draft, string>>;

export default function ProjectsEditor({ initialProjects }: Props) {
  const toast = useToast();
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [editing, setEditing] = React.useState<string | 'new' | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [baseline, setBaseline] = React.useState<Draft>(EMPTY);
  const [techInput, setTechInput] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [pendingDelete, setPendingDelete] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const isDirty =
    editing !== null && JSON.stringify(draft) !== JSON.stringify(baseline);
  const dirtyGuard = useDirtyGuard(isDirty);

  // ── Reordering ────────────────────────────────────────────────────────────
  const persistOrder = React.useCallback(
    async (changes: { id: string; sort_order: number }[], next: Project[]) => {
      const previous = projects;
      setProjects(next); // optimistic

      try {
        // Only the rows whose position actually changed.
        await Promise.all(
          changes.map(c =>
            fetch(`/api/admin/projects/${c.id}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ sort_order: c.sort_order }),
            }).then(r => {
              if (!r.ok) throw new Error(`Failed to save order (${r.status})`);
            })
          )
        );
      } catch (err) {
        setProjects(previous); // rollback
        toast.error('Could not save the new order', {
          description: err instanceof Error ? err.message : undefined,
          retry: () => void persistOrder(changes, next),
        });
      }
    },
    [projects, toast]
  );

  const reorder = useReorder<Project>({
    items: projects,
    onPersist: persistOrder,
    describe: p => `“${p.title}”`,
  });

  // ── Form ──────────────────────────────────────────────────────────────────
  const openEdit = (p: Project) => {
    const next: Draft = {
      title: p.title,
      description: p.description ?? '',
      tech: p.tech ?? [],
      link: p.link ?? '',
      image_url: p.image_url ?? '',
      visible: p.visible,
    };
    dirtyGuard.guard(() => {
      setDraft(next);
      setBaseline(next);
      setTechInput('');
      setEditing(p.id);
      setFieldErrors({});
    });
  };

  const openNew = () => {
    dirtyGuard.guard(() => {
      setDraft(EMPTY);
      setBaseline(EMPTY);
      setTechInput('');
      setEditing('new');
      setFieldErrors({});
    });
  };

  const closeForm = () => {
    dirtyGuard.guard(() => {
      setEditing(null);
      setFieldErrors({});
    });
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(d => ({ ...d, [key]: value }));
    setFieldErrors(e => ({ ...e, [key]: undefined }));
  };

  /** Chip input: Enter or comma commits, Backspace on empty removes the last. */
  const onTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = techInput.trim().replace(/,$/, '');
      if (value && !draft.tech.includes(value)) {
        update('tech', [...draft.tech, value]);
      }
      setTechInput('');
    } else if (e.key === 'Backspace' && techInput === '' && draft.tech.length > 0) {
      update('tech', draft.tech.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFieldErrors({});

    const isNew = editing === 'new';
    const url = isNew ? '/api/admin/projects' : `/api/admin/projects/${editing}`;
    const body: Record<string, unknown> = { ...draft };

    // New records land at the end, matching the sort the list is displayed in.
    if (isNew) body.sort_order = projects.length;

    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.href = '/edit/login?expired=1';
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Map zod's flattened field errors back onto the form rather than
        // discarding them for a generic "Save failed".
        const flattened = data?.details?.fieldErrors as
          | Record<string, string[]>
          | undefined;

        if (flattened) {
          const mapped: FieldErrors = {};
          for (const [key, messages] of Object.entries(flattened)) {
            if (messages?.length) mapped[key as keyof Draft] = messages[0];
          }
          setFieldErrors(mapped);
        }

        toast.error('Could not save', {
          description: data?.error ?? `Request failed (${res.status})`,
        });
        return;
      }

      setProjects(prev =>
        isNew ? [...prev, data] : prev.map(p => (p.id === editing ? { ...p, ...data } : p))
      );
      setEditing(null);
      setBaseline(draft);

      // Naming the record and confirming revalidation is the reassurance the
      // owner actually wants — the public site is already updated.
      toast.success(`“${draft.title}” saved — public site revalidated.`);
    } catch (err) {
      toast.error('Could not save', {
        description: err instanceof Error ? err.message : undefined,
        retry: handleSave,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;

    try {
      const res = await fetch(`/api/admin/projects/${target.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      setProjects(prev => prev.filter(p => p.id !== target.id));
      setPendingDelete(null);
      toast.success(`“${target.title}” deleted — public site revalidated.`);
    } catch (err) {
      toast.error('Could not delete', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleVisible = async (project: Project) => {
    const next = !project.visible;
    const previous = projects;

    // Optimistic: a toggle should feel instant and needs no toast on success.
    setProjects(prev => prev.map(p => (p.id === project.id ? { ...p, visible: next } : p)));

    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visible: next }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
    } catch (err) {
      setProjects(previous);
      toast.error(`Could not ${next ? 'show' : 'hide'} “${project.title}”`, {
        description: err instanceof Error ? err.message : undefined,
        retry: () => void toggleVisible(project),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </p>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5
                     text-sm font-medium text-primary-foreground transition-opacity
                     hover:opacity-90 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
          New project
        </button>
      </div>

      {editing === 'new' && (
        <ProjectForm
          draft={draft}
          errors={fieldErrors}
          techInput={techInput}
          saving={saving}
          isDirty={isDirty}
          onTechInput={setTechInput}
          onTechKeyDown={onTechKeyDown}
          onChange={update}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}

      {projects.length === 0 && editing !== 'new' ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Projects appear in the Projects section of your public site."
          action={
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5
                         text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add your first project
            </button>
          }
        />
      ) : (
        <RecordList announcement={reorder.announcement}>
          {projects.map((project, index) => (
            <RecordRow
              key={project.id}
              position={index + 1}
              total={projects.length}
              label={project.title}
              dimmed={!project.visible}
              reorder={{
                index,
                onKeyDown: reorder.handleKeyDown,
                dragHandlers: reorder.dragHandlers,
                isDragging: reorder.dragIndex === index,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {project.title}
                    {!project.visible && (
                      <span className="ml-2 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-medium text-warn">
                        Hidden
                      </span>
                    )}
                  </p>
                  {project.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={project.visible}
                    onCheckedChange={() => void toggleVisible(project)}
                    label={`${project.visible ? 'Hide' : 'Show'} ${project.title}`}
                  />
                  <button
                    type="button"
                    onClick={() => openEdit(project)}
                    aria-label={`Edit ${project.title}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors
                               hover:bg-secondary hover:text-foreground focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(project)}
                    aria-label={`Delete ${project.title}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors
                               hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Inline expansion — the form opens in place rather than in a
                  panel mounted at the top of the page, so the row being edited
                  stays where the eye already is. */}
              {editing === project.id && (
                <div className="animate-admin-fade-up mt-3 border-t border-border pt-3">
                  <ProjectForm
                    draft={draft}
                    errors={fieldErrors}
                    techInput={techInput}
                    saving={saving}
                    isDirty={isDirty}
                    onTechInput={setTechInput}
                    onTechKeyDown={onTechKeyDown}
                    onChange={update}
                    onSave={handleSave}
                    onCancel={closeForm}
                  />
                </div>
              )}
            </RecordRow>
          ))}
        </RecordList>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
        title={`Delete “${pendingDelete?.title ?? ''}”?`}
        description="This removes it from your public site immediately. This cannot be undone."
        onConfirm={handleDelete}
        pending={deleting}
        preview={
          pendingDelete?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pendingDelete.image_url}
              alt=""
              className="h-24 w-full rounded-md object-cover"
            />
          ) : undefined
        }
      />

      <AlertDialog
        open={dirtyGuard.isConfirming}
        onOpenChange={open => !open && dirtyGuard.cancelDiscard()}
        title="Discard unsaved changes?"
        description="Your edits to this project have not been saved."
        confirmLabel="Discard"
        onConfirm={dirtyGuard.confirmDiscard}
      />
    </div>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

interface FormProps {
  draft: Draft;
  errors: FieldErrors;
  techInput: string;
  saving: boolean;
  isDirty: boolean;
  onTechInput: (v: string) => void;
  onTechKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ProjectForm({
  draft,
  errors,
  techInput,
  saving,
  isDirty,
  onTechInput,
  onTechKeyDown,
  onChange,
  onSave,
  onCancel,
}: FormProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const linkId = React.useId();
  const techId = React.useId();

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
    'placeholder:text-muted-foreground focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor={titleId} required>
          Title
        </Label>
        <input
          id={titleId}
          value={draft.title}
          onChange={e => onChange('title', e.target.value)}
          aria-invalid={Boolean(errors.title)}
          className={inputClass}
        />
        <FieldMeta value={draft.title} limit={LIMITS.title} error={errors.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={descId}>Description</Label>
        <textarea
          id={descId}
          rows={3}
          value={draft.description ?? ''}
          onChange={e => onChange('description', e.target.value)}
          aria-invalid={Boolean(errors.description)}
          className={cn(inputClass, 'resize-y')}
        />
        <FieldMeta
          value={draft.description ?? ''}
          limit={LIMITS.description}
          error={errors.description}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={techId}>Tech stack</Label>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-background p-2">
          {draft.tech.map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange('tech', draft.tech.filter(x => x !== t))}
                aria-label={`Remove ${t}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            id={techId}
            value={techInput}
            onChange={e => onTechInput(e.target.value)}
            onKeyDown={onTechKeyDown}
            placeholder={draft.tech.length === 0 ? 'React, TypeScript…' : ''}
            className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none
                       placeholder:text-muted-foreground"
          />
        </div>
        <FieldMeta value="" hint="Press Enter or comma to add. Backspace removes the last." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={linkId}>Link</Label>
        <input
          id={linkId}
          value={draft.link ?? ''}
          onChange={e => onChange('link', e.target.value)}
          placeholder="https://…"
          aria-invalid={Boolean(errors.link)}
          className={inputClass}
        />
        <FieldMeta value={draft.link ?? ''} error={errors.link} />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={draft.visible}
          onCheckedChange={v => onChange('visible', v)}
          label="Visible on the public site"
        />
        <span className="text-sm text-muted-foreground">Visible on the public site</span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        {isDirty ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />
            Unsaved changes
          </span>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium
                       transition-colors hover:bg-secondary focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !isDirty}
            className={cn(
              'rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
              'transition-opacity hover:opacity-90 focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
              // 45% when clean, per the brief — visibly inert but still legible.
              (saving || !isDirty) && 'opacity-45'
            )}
          >
            {/* Fixed width so the button does not resize mid-save. */}
            <span className="inline-block min-w-[3.5rem]">
              {saving ? 'Saving…' : 'Save'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}
