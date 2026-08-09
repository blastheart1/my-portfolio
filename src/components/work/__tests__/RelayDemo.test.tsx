/**
 * RelayDemo.test.tsx
 *
 * The demo's job is to be honest about what it did. The failure that matters
 * is not a crash — it is a green tick over a draft nothing checked, or a
 * stored example presented as a live result.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

/** Notes, quota and models load on mount; the draft call is queued per-test. */
function primeMount(providers: Array<{ id: string; label: string }> = [{ id: 'openai', label: 'OpenAI' }]) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ notes: SEED_NOTES }))
    .mockResolvedValueOnce(jsonResponse({ limit: 3, remaining: 3, cooldownMinutes: 5, retryAfterSeconds: 0 }))
    .mockResolvedValueOnce(jsonResponse({ providers }));
}

const CLEAN_RESULT = {
  draft: { subject: 'Onboarding frameworks', body: [{ text: 'Hi Lewis,' }], provider: 'openai', model: 'gpt-4o-mini' },
  verdict: {
    faithful: true,
    accuracy: 0.97,
    fabrications: [],
    omissions: [],
    changes: [
      { text: 'Left the recipient email blank because it was not dictated.', needsLook: true },
      { text: 'Removed filler and tightened repeated phrasing.', needsLook: false },
    ],
    styleScore: 0.88,
    styleNotes: 'Warm and on-brand; the rhythm and sign-off match.',
    auditorProvider: 'anthropic',
    attempts: 1,
  },
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
  // The examples rail became a select when the layout moved to the reference's
  // two-pane review, so wait on the draft control rather than an example row.
  const button = await screen.findByRole('button', { name: /draft the reply/i });
  await user.click(button);
}

describe('happy path', () => {
  it('lists the seeded inbox and shows the first transcript', async () => {
    primeMount();
    render(<RelayDemo />);

    const picker = await screen.findByRole('combobox', { name: /example note/i });
    for (const note of SEED_NOTES) {
      expect(within(picker).getByRole('option', { name: new RegExp(note.correspondent) })).toBeInTheDocument();
    }
    // The transcript now renders as timestamped segments rather than one blob.
    expect(await screen.findByText(SEED_NOTES[0].segments![0].text)).toBeInTheDocument();
    expect(screen.getByText(SEED_NOTES[0].segments![0].time)).toBeInTheDocument();
  });

  it('drafts a reply and reports the auditor that checked it', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT, { headers: { 'X-Demo-Remaining': '2' } }));

    await draft();

    // The subject now appears twice by design: as the page heading, the way
    // the reference does it, and again above the draft body.
    expect((await screen.findAllByText('Onboarding frameworks')).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /onboarding frameworks/i })).toBeInTheDocument();
    expect(screen.getByText(/audited by anthropic/i)).toBeInTheDocument();
    expect(screen.getByText(/grounded in the voice note/i)).toBeInTheDocument();
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
    expect(screen.queryByText(/grounded in the voice note/i)).toBeNull();
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

    expect(await screen.findByText(/could not be traced back to the note/i)).toBeInTheDocument();
    expect(screen.getByText(/1 to confirm/i)).toBeInTheDocument();
    expect(screen.getByText(/no date was mentioned/)).toBeInTheDocument();
    expect(screen.getByText(/redrafted once/i)).toBeInTheDocument();
  });

  it('shows the auditor’s reason when a highlight is hovered', async () => {
    const user = userEvent.setup();
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CLEAN_RESULT,
        draft: {
          ...CLEAN_RESULT.draft,
          body: [
            { text: 'It was great connecting ' },
            { text: 'yesterday', flagged: true, reason: 'Confirm that the conversation happened yesterday.' },
          ],
        },
      })
    );

    await draft();
    await user.hover(await screen.findByRole('button', { name: 'yesterday' }));

    expect(
      await screen.findByRole('tooltip')
    ).toHaveTextContent('Confirm that the conversation happened yesterday.');
  });

  it('reveals the same reason on keyboard focus, not hover alone', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CLEAN_RESULT,
        draft: {
          ...CLEAN_RESULT.draft,
          body: [{ text: 'yesterday', flagged: true, reason: 'Confirm the date.' }],
        },
      })
    );

    await draft();
    (await screen.findByRole('button', { name: 'yesterday' })).focus();

    // A highlight whose explanation is mouse-only is invisible to anyone
    // tabbing through the draft.
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Confirm the date.');
  });

  it('falls back to generic guidance when the auditor gave no reason', async () => {
    const user = userEvent.setup();
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CLEAN_RESULT,
        draft: { ...CLEAN_RESULT.draft, body: [{ text: 'Thursday', flagged: true }] },
      })
    );

    await draft();
    await user.hover(await screen.findByRole('button', { name: 'Thursday' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/inferred rather than heard/i);
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
      .mockResolvedValueOnce(jsonResponse({ limit: 3, remaining: 3 }))
      .mockResolvedValueOnce(jsonResponse({ providers: [] }));

    render(<RelayDemo />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});


describe('the model row reflects what is configured', () => {
  it('names the configured providers', async () => {
    primeMount([{ id: 'openai', label: 'OpenAI' }, { id: 'anthropic', label: 'Anthropic Claude' }]);
    render(<RelayDemo />);

    expect(await screen.findByText(/OpenAI \+ Anthropic Claude/)).toBeInTheDocument();
  });

  it('says none rather than offering a provider with no key', async () => {
    primeMount([]);
    render(<RelayDemo />);

    // A visitor must not be able to route the quota at a vendor whose key was
    // deliberately not set.
    expect(await screen.findByText(/none configured/i)).toBeInTheDocument();
  });
});

describe('nothing can be sent', () => {
  it('offers no send control anywhere in the compose view', async () => {
    const user = userEvent.setup();
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT));
    await draft();

    await user.click(await screen.findByRole('button', { name: /email/i }));

    // A public endpoint that emails arbitrary recipients is an open relay. The
    // control is absent, not disabled — a disabled button invites someone to
    // go looking for the endpoint behind it.
    expect(screen.queryByRole('button', { name: /^send/i })).toBeNull();
    expect(screen.getByText(/nothing is sent/i)).toBeInTheDocument();
  });
});


describe('the review panels', () => {
  it('lists what Relay changed and assumed, with a count of what needs a look', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT));

    await draft();

    expect(await screen.findByText(/what relay changed & assumed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 need a look/i)).toBeInTheDocument();
    expect(screen.getByText(/left the recipient email blank/i)).toBeInTheDocument();
  });

  it('separates assumptions to confirm from changes already made', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT));
    await draft();

    // The icon is not the only signal: each row states which kind it is, or
    // the distinction is lost to anyone not reading colour and glyphs.
    expect(await screen.findByText(/needs a look:/i)).toBeInTheDocument();
    expect(screen.getByText(/^done:/i)).toBeInTheDocument();
  });

  it('shows the faithfulness verdict with its score and auditor', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT));

    await draft();

    expect(await screen.findByText(/faithfulness check/i)).toBeInTheDocument();
    expect(screen.getByText('Grounded')).toBeInTheDocument();
    expect(screen.getByText('97% accurate')).toBeInTheDocument();
    expect(screen.getByText(/audited by anthropic/i)).toBeInTheDocument();
  });

  it('reports accuracy and style together when the auditor gave both', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(jsonResponse(CLEAN_RESULT));

    await draft();

    expect(await screen.findByText(/accuracy 97% · style 88%/i)).toBeInTheDocument();
  });

  it('claims no verdict at all when nothing audited the draft', async () => {
    primeMount();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CLEAN_RESULT,
        verdict: { ...CLEAN_RESULT.verdict, auditorProvider: null, changes: [] },
      })
    );

    await draft();

    expect(await screen.findByText('Not audited')).toBeInTheDocument();
    expect(screen.queryByText('Grounded')).toBeNull();
  });

  it('survives a verdict with no changes array at all', async () => {
    primeMount();
    const { changes: _drop, ...verdict } = CLEAN_RESULT.verdict;
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...CLEAN_RESULT, verdict }));

    await draft();

    // A partial response reaching .filter() took the whole panel down, after
    // the visitor had already spent one of three runs.
    expect(await screen.findByText(/faithfulness check/i)).toBeInTheDocument();
  });
});
