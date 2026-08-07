/**
 * login-navigation.test.tsx
 *
 * After a successful sign-in the password form stayed on screen until the
 * page was reloaded manually.
 *
 * Cause: the handler called router.push('/edit'). Next's client Router Cache
 * already held the RSC payload for /edit from before login, when the proxy had
 * redirected it back to /edit/login. A soft navigation reuses that entry, so
 * the browser re-rendered the login page even though the session cookie was
 * now set.
 *
 * A full document navigation discards the cache and re-runs the proxy with the
 * cookie present. Login happens once per session, so nothing is lost.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LoginPage from '../page';

const assign = vi.fn();

beforeEach(() => {
  assign.mockReset();
  // jsdom's location is not writable; replacing the property is the supported
  // way to observe a full navigation.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockLogin(ok: boolean, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: async () => body } as Response)
  );
}

async function signIn() {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText(/password/i), 'correct-horse');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('successful sign-in leaves the login page', () => {
  it('performs a full navigation to /edit rather than a soft push', async () => {
    mockLogin(true);

    await signIn();

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/edit'));
  });

  it('keeps the submit button disabled while the browser navigates away', async () => {
    mockLogin(true);

    await signIn();

    await waitFor(() => expect(assign).toHaveBeenCalled());
    // Re-enabling here would flash an interactive form over a page that is
    // already unloading.
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});

describe('failed sign-in stays put', () => {
  it('shows the server error and does not navigate', async () => {
    mockLogin(false, { error: 'Invalid password' });

    await signIn();

    expect(await screen.findByText('Invalid password')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('re-enables the button so another attempt is possible', async () => {
    mockLogin(false, { error: 'Invalid password' });

    await signIn();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
    );
  });
});
