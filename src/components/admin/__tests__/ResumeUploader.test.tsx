/**
 * ResumeUploader.test.tsx
 *
 * The Download Resume button used to point at a file committed to public/, so
 * replacing the resume meant a repo edit and a redeploy. It is now managed
 * content, uploaded to Vercel Blob and stored as `about.resume_url`.
 *
 * The important behaviours: reject bad files before spending a network call,
 * and never leave the public button pointing at a file that failed to save.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import ResumeUploader from '../ResumeUploader';
import { ToastProvider } from '@/components/ui/toast';

const renderUploader = () =>
  render(
    <ToastProvider>
      <ResumeUploader />
    </ToastProvider>
  );

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const pdf = (name = 'resume.pdf', size = 1000) => {
  const file = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('current state', () => {
  it('shows the bundled default when no resume has been uploaded', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();

    expect(
      await screen.findByText(/Using the bundled default/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload resume/ })).toBeInTheDocument();
  });

  it('links to the stored resume once one exists', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json({ resume_url: 'https://blob.example.com/resume-v2.pdf' })
    );
    renderUploader();

    const link = await screen.findByRole('link', { name: 'resume-v2.pdf' });
    expect(link).toHaveAttribute('href', 'https://blob.example.com/resume-v2.pdf');
    expect(screen.getByRole('button', { name: /Replace resume/ })).toBeInTheDocument();
  });

  it('degrades to the default if the content lookup fails', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ error: 'boom' }, 500));
    renderUploader();

    expect(await screen.findByText(/Using the bundled default/)).toBeInTheDocument();
  });
});

describe('client-side validation happens before any upload', () => {
  it('rejects a non-PDF without calling the network', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);
    vi.mocked(fetch).mockClear();

    const input = document.getElementById('resume-file') as HTMLInputElement;
    const png = new File(['x'], 'photo.png', { type: 'image/png' });

    // userEvent.upload honours the input's accept="application/pdf" and drops
    // the file before any handler runs — correct browser behaviour, but it
    // would mean this test proved nothing. Setting the files directly
    // simulates the paths that bypass the picker's filter (drag and drop, a
    // renamed file, a browser that ignores accept).
    Object.defineProperty(input, 'files', { value: [png], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByRole('alert')).toHaveTextContent('Resume must be a PDF.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a file over 5 MB and says how big it was', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);
    vi.mocked(fetch).mockClear();

    const input = document.getElementById('resume-file') as HTMLInputElement;
    await userEvent.upload(input, pdf('big.pdf', 6 * 1024 * 1024));

    expect(await screen.findByRole('alert')).toHaveTextContent('6.0 MB');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a PDF at exactly the limit', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);

    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ url: 'https://blob.example.com/r.pdf' }))
      .mockResolvedValueOnce(json({ ok: true }));

    const input = document.getElementById('resume-file') as HTMLInputElement;
    await userEvent.upload(input, pdf('r.pdf', 5 * 1024 * 1024));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

describe('upload flow', () => {
  it('uploads then points the public button at the new file', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);

    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ url: 'https://blob.example.com/new.pdf' }))
      .mockResolvedValueOnce(json({ ok: true }));

    const input = document.getElementById('resume-file') as HTMLInputElement;
    await userEvent.upload(input, pdf('new.pdf'));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
      expect(calls).toContain('/api/admin/images');
      expect(calls).toContain('/api/admin/content/about');
    });

    // The saved field is what AboutSection reads. Match on the PATCH
    // specifically — the first call to this URL is the initial GET, which has
    // no body.
    const patch = vi.mocked(fetch).mock.calls.find(
      c => String(c[0]) === '/api/admin/content/about' && c[1]?.method === 'PATCH'
    );
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      fields: { resume_url: 'https://blob.example.com/new.pdf' },
    });
  });

  it('confirms with a toast mentioning revalidation', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);

    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ url: 'https://blob.example.com/new.pdf' }))
      .mockResolvedValueOnce(json({ ok: true }));

    const input = document.getElementById('resume-file') as HTMLInputElement;
    await userEvent.upload(input, pdf());

    expect(
      await screen.findByText(/Resume updated — public site revalidated/)
    ).toBeInTheDocument();
  });

  it('reports an upload failure with the server message', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);

    vi.mocked(fetch).mockResolvedValueOnce(json({ error: 'Unsupported file type' }, 400));

    const input = document.getElementById('resume-file') as HTMLInputElement;
    await userEvent.upload(input, pdf());

    expect(await screen.findByText('Unsupported file type')).toBeInTheDocument();
  });

  it('does not claim success when saving the link fails', async () => {
    vi.mocked(fetch).mockResolvedValue(json({}));
    renderUploader();
    await screen.findByText(/Using the bundled default/);

    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ url: 'https://blob.example.com/new.pdf' }))
      .mockResolvedValueOnce(json({ error: 'Invalid input' }, 400));

    const input = document.getElementById('resume-file') as HTMLInputElement;
    await userEvent.upload(input, pdf());

    // Blob accepted the file but the button still points at the old one —
    // reporting success here would be a lie.
    expect(await screen.findByText('Invalid input')).toBeInTheDocument();
    expect(screen.queryByText(/Resume updated/)).not.toBeInTheDocument();
  });
});
