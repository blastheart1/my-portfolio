'use client';

import * as React from 'react';
import { FileText, Upload } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = 'application/pdf';

/**
 * Resume upload.
 *
 * The Download Resume button on the public About section used to point at a
 * file committed to public/, so replacing the resume meant editing the repo
 * and redeploying. The PDF now goes to Vercel Blob through the existing media
 * upload route, and its URL is stored as `about.resume_url`.
 *
 * AboutSection still falls back to the committed file when that field is
 * unset, so nothing breaks before the first upload.
 */
export default function ResumeUploader() {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [currentUrl, setCurrentUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/admin/content/about')
      .then(async r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return (await r.json()) as Record<string, string>;
      })
      .then(data => setCurrentUrl(data.resume_url || null))
      .catch(() => setCurrentUrl(null))
      .finally(() => setLoading(false));
  }, []);

  const handleFile = async (file: File) => {
    // Validate before touching the network — a rejected upload should cost
    // nothing and say why immediately.
    setValidationError(null);

    if (file.type !== ACCEPT) {
      setValidationError('Resume must be a PDF.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setValidationError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`
      );
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('label', 'resume');

      const uploadRes = await fetch('/api/admin/images', { method: 'POST', body: form });
      const uploadBody = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok) {
        throw new Error(uploadBody?.error ?? `Upload failed (${uploadRes.status})`);
      }

      const url: string = uploadBody.url;

      // Point the public button at the new file.
      const saveRes = await fetch('/api/admin/content/about', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: { resume_url: url } }),
      });
      if (!saveRes.ok) {
        const saveBody = await saveRes.json().catch(() => null);
        throw new Error(saveBody?.error ?? `Could not save the link (${saveRes.status})`);
      }

      setCurrentUrl(url);
      toast.success('Resume updated — public site revalidated.');
    } catch (err) {
      toast.error('Could not update the resume', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Resume</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The PDF behind the Download Resume button in the About section.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Label htmlFor="resume-file">Current file</Label>

        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

          {loading ? (
            <span className="text-sm text-muted-foreground">Checking…</span>
          ) : currentUrl ? (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm underline underline-offset-2 hover:no-underline"
            >
              {currentUrl.split('/').pop()}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">
              Using the bundled default (/AntonioLuisSantos-Resume.pdf)
            </span>
          )}
        </div>

        <div className="mt-4">
          <input
            ref={inputRef}
            id="resume-file"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5
                       text-sm font-medium transition-colors hover:bg-secondary
                       disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-ring"
          >
            <Upload className="size-4" aria-hidden="true" />
            {uploading ? 'Uploading…' : currentUrl ? 'Replace resume' : 'Upload resume'}
          </button>

          <p className="mt-1.5 text-xs text-muted-foreground">PDF, up to 5 MB.</p>

          {validationError && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              {validationError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
