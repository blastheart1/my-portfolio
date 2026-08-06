/**
 * useAdminFetch.test.tsx
 *
 * Phase 3 — the feedback layer.
 *
 * The gate for this phase is "kill the DB and every page degrades legibly".
 * The bug being fixed is specific: all five loaders did `.catch(() => setX([]))`,
 * turning any failure into an empty list. These tests pin the distinction
 * between "empty" and "broken".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import { useAdminFetch, selectArray } from '../useAdminFetch';
import AdminResource from '@/components/admin/AdminResource';

interface Row { id: string; title: string }

function Harness({ url = '/api/admin/projects' }: { url?: string }) {
  const state = useAdminFetch<Row[]>(url, { select: selectArray });
  return (
    <AdminResource state={state}>
      {rows => (
        <ul>
          {rows.map(r => (
            <li key={r.id}>{r.title}</li>
          ))}
          {rows.length === 0 && <li>NO_ROWS</li>}
        </ul>
      )}
    </AdminResource>
  );
}

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('successful load', () => {
  it('renders the rows', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse([{ id: '1', title: 'Portfolio site' }])
    );
    render(<Harness />);

    expect(await screen.findByText('Portfolio site')).toBeInTheDocument();
  });

  it('shows a skeleton while loading, not a bare “Loading…” string', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<Harness />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('sends cookies so the session is actually used', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]));
    render(<Harness />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      credentials: 'same-origin',
    });
  });
});

describe('empty vs broken — the distinction the old loaders lost', () => {
  it('renders an empty list as empty', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]));
    render(<Harness />);

    expect(await screen.findByText('NO_ROWS')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a server error as an error, NOT as an empty list', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'Failed to fetch projects' }, 500)
    );
    render(<Harness />);

    // The old behaviour showed "no projects", inviting the owner to recreate
    // content that still exists.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('NO_ROWS')).not.toBeInTheDocument();
  });

  it('surfaces the server’s own message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'password authentication failed for user' }, 500)
    );
    render(<Harness />);

    expect(
      await screen.findByText(/password authentication failed/)
    ).toBeInTheDocument();
  });

  it('falls back to the status code when there is no message', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse('not json', 503));
    render(<Harness />);

    expect(await screen.findByText(/503/)).toBeInTheDocument();
  });

  it('treats a network failure as an error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));
    render(<Harness />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('treats an unexpected payload shape as an error', async () => {
    // selectArray tolerates it, so use a select that throws.
    function StrictHarness() {
      const state = useAdminFetch<Row[]>('/x', {
        select: raw => {
          if (!Array.isArray(raw)) throw new Error('Unexpected response shape');
          return raw as Row[];
        },
      });
      return <AdminResource state={state}>{() => <p>ok</p>}</AdminResource>;
    }

    vi.mocked(fetch).mockResolvedValue(jsonResponse({ nope: true }));
    render(<StrictHarness />);

    expect(await screen.findByText('Unexpected response shape')).toBeInTheDocument();
  });
});

describe('retry', () => {
  it('offers Retry and recovers on success', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: 'Boom' }, 500))
      .mockResolvedValueOnce(jsonResponse([{ id: '1', title: 'Recovered' }]));

    render(<Harness />);
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('session expiry', () => {
  it('redirects to the login page on 401 instead of showing an error', async () => {
    const original = window.location;
    // @ts-expect-error — replacing location for assertion
    delete window.location;
    // @ts-expect-error — minimal stub
    window.location = { href: '' };

    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401));
    render(<Harness />);

    await waitFor(() =>
      expect(window.location.href).toBe('/edit/login?expired=1')
    );

    // @ts-expect-error — restore
    window.location = original;
  });
});

describe('selectArray', () => {
  it('passes arrays through', () => {
    expect(selectArray([1, 2])).toEqual([1, 2]);
  });

  it('coerces a non-array to empty rather than crashing the page', () => {
    expect(selectArray(null)).toEqual([]);
    expect(selectArray({ a: 1 })).toEqual([]);
  });
});
