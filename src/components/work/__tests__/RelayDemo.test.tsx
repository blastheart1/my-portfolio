/**
 * RelayDemo.test.tsx
 *
 * The demo's job is to be honest about what it did. The failure that matters
 * is not a crash — it is a green tick over a draft nothing checked, or a
 * stored example presented as a live result.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RelayDemo from '../RelayDemo';
import { SEED_NOTES } from '@/lib/demo/relay/seed';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    headers: { get: (k: string) => init.headers?.[k] ?? null },
  };
}

/** Notes and quota load on mount; the draft call is queued per-test. */
function primeMount() {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ notes: SEED_NOTES }))
    .mockResolvedValueOnce(jsonResponse({ limit: 3, remaining: 3, cooldownMinutes: 5, retryAfterSeconds: 0 }));
}

const CLEAN_RESULT = {
  draft: { subject: 'Onboarding frameworks', body: [{ text: 'Hi Lewis,' }], provider: 'openai', model: 'gpt-4o-mini' },
  verdict: { faithful: true, accuracy: 0.97, fabrications: [], omissions: [], auditorProvider: 'anthropic', attempts: 1 },
  status: 'ready',
  degraded: false,
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

async function draft() {
  const user = userEvent.setup();
  render(<RelayDemo />);
  await screen.findByRole('button', { name: /Lewis/ });
  await user.click(screen.getByRole('button', { name: /draft the reply/i }));
}

describe('happy path', () => {
  it('lists the seeded inbox and shows the first transcript', async () => {
    primeMount();
    render(<RelayDemo />);

    for (const note of SEED_NOTES) {
      expect(await screen.findByRole('button', { name: new RegExp(note.correspondent) })).toBeInTheDocument();
    }
    expect(screen.getByText(SEED_NOTES[0].transcript)).toBeInTheDocument();
  });

  it('drafts a reply and reports the auditor that checked it', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT, { headers: { 'X-Demo-Remaining': '2' } }));

    await draft();

    expect(await screen.findByText('Onboarding frameworks')).toBeInTheDocument();
    expect(screen.getByText(/audited by anthropic/i)).toBeInTheDocument();
    expect(screen.getByText(/every claim traced back/i)).toBeInTheDocument();
  });

  it('updates the remaining-runs indicator from the response header', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT, { headers: { 'X-Demo-Remaining': '2' } }));

    await draft();

    expect(await screen.findByText(/2 of 3 runs left today/i)).toBeInTheDocument();
  });
});

describe('never overstates what happened', () => {
  it('says a draft was not audited when no auditor ran', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...CLEAN_RESULT, verdict: { ...CLEAN_RESULT.verdict, auditorProvider: null } })
    );

    await draft();

    expect(await screen.findByText(/not audited/i)).toBeInTheDocument();
    expect(screen.queryByText(/every claim traced back/i)).toBeNull();
  });

  it('labels a stored example as one', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...CLEAN_RESULT, degraded: true }));

    await draft();

    expect(await screen.findByText(/stored example rather than a live result/i)).toBeInTheDocument();
  });

  it('lists what the auditor rejected, rather than hiding it', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CLEAN_RESULT,
        status: 'needs_review',
        verdict: {
          ...CLEAN_RESULT.verdict,
          faithful: false,
          attempts: 2,
          fabrications: [{ text: 'next Tuesday', severity: 'high', why: 'no date was mentioned' }],
        },
      })
    );

    await draft();

    expect(await screen.findByText(/1 claim the note does not support/i)).toBeInTheDocument();
    expect(screen.getByText(/no date was mentioned/)).toBeInTheDocument();
    expect(screen.getByText(/redrafted once/i)).toBeInTheDocument();
  });

  it('marks inferred spans with a title, not colour alone', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CLEAN_RESULT,
        draft: { ...CLEAN_RESULT.draft, body: [{ text: 'See you ' }, { text: 'Thursday', flagged: true }] },
      })
    );

    await draft();

    const mark = await screen.findByText('Thursday');
    expect(mark.tagName).toBe('MARK');
    expect(mark).toHaveAttribute('title', expect.stringMatching(/inferred/i));
  });
});

describe('refusals and failures', () => {
  it('shows the quota message when the limit is hit', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'Give it 5 minutes between runs — this calls a paid model.' }, { ok: false, status: 429 })
    );

    await draft();

    expect(await screen.findByRole('alert')).toHaveTextContent(/5 minutes between runs/);
  });

  it('does not render a draft panel when the request was refused', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, { ok: false, status: 429 }));

    await draft();

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/audited by/i)).toBeNull();
  });

  it('survives a notes endpoint that returns an error object', async () => {
    // An error body reaching .map() would blank the whole panel.
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, { ok: false, status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ limit: 3, remaining: 3 }));

    render(<RelayDemo />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
