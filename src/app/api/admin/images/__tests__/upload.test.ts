/**
 * upload.test.ts
 *
 * Two production bugs, both of which surfaced as an identical bare 500 from
 * POST /api/admin/images with nothing in the body to act on:
 *
 *  1. BLOB_READ_WRITE_TOKEN was never set on the deployment, so put() threw
 *     before anything was written. media_assets had zero rows, meaning no
 *     upload had ever succeeded.
 *
 *  2. media_assets.label is UNIQUE and ResumeUploader hardcodes the label
 *     'resume'. Even with storage configured, the second upload would always
 *     violate the constraint — so "Replace resume" could never work, only the
 *     very first upload.
 *
 * Both are configuration-shaped failures that the route reported as generic
 * server errors, which is why they were invisible. These tests pin the fixes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const put = vi.fn();
const sqlTag = vi.fn();

vi.mock('@vercel/blob', () => ({ put: (...args: unknown[]) => put(...args) }));
vi.mock('@/lib/neon', () => ({ getSql: () => sqlTag }));
// Auth is covered by auth-guards.test.ts; these cases are about what happens
// after the guard passes.
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }));

/** Builds a POST request carrying one file, the way the uploaders do. */
function uploadRequest(label = 'resume') {
  const form = new FormData();
  form.append('file', new File([new Uint8Array([1, 2, 3])], 'cv.pdf', { type: 'application/pdf' }));
  form.append('label', label);
  return new Request('http://localhost/api/admin/images', { method: 'POST', body: form });
}

async function postImage(label?: string) {
  const { POST } = await import('../route');
  // The handler only uses NextRequest members that Request already provides.
  return POST(uploadRequest(label) as never);
}

const ORIGINAL_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

beforeEach(() => {
  vi.resetModules();
  put.mockReset();
  sqlTag.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';
  put.mockResolvedValue({ url: 'https://blob.example/cv.pdf', pathname: 'portfolio/cv.pdf' });
  sqlTag.mockResolvedValue([{ id: 'a1', label: 'resume', url: 'https://blob.example/cv.pdf' }]);
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = ORIGINAL_TOKEN;
});

describe('missing blob storage is reported, not swallowed', () => {
  it('does not attempt an upload when BLOB_READ_WRITE_TOKEN is unset', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const res = await postImage();

    expect(res.status).toBe(500);
    expect(put).not.toHaveBeenCalled();
  });

  it('names the missing variable so the fix is obvious from the response', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const body = (await (await postImage()).json()) as { error: string };

    expect(body.error).toContain('BLOB_READ_WRITE_TOKEN');
  });

  it('surfaces the underlying reason when the upload itself fails', async () => {
    put.mockRejectedValue(new Error('Access denied, please provide a valid token'));

    const res = await postImage();
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(500);
    // The old handler returned a fixed 'Failed to upload image' here, which is
    // what made this undiagnosable from the browser.
    expect(body.error).toContain('valid token');
  });
});

describe('re-uploading under an existing label replaces it', () => {
  it('upserts on the unique label instead of inserting a duplicate', async () => {
    await postImage('resume');

    const [strings] = sqlTag.mock.calls[0] as [string[]];
    const query = strings.join('?');

    expect(query).toMatch(/ON CONFLICT \(label\) DO UPDATE/i);
    expect(query).toMatch(/url\s*=\s*EXCLUDED\.url/i);
  });

  it('refreshes created_at so the media list still orders by recency', async () => {
    await postImage('resume');

    const [strings] = sqlTag.mock.calls[0] as [string[]];
    expect(strings.join('?')).toMatch(/created_at\s*=\s*now\(\)/i);
  });

  it('returns the stored row on a successful replace', async () => {
    const res = await postImage('resume');

    expect(res.status).toBe(201);
    expect((await res.json()) as { label: string }).toMatchObject({ label: 'resume' });
  });
});
