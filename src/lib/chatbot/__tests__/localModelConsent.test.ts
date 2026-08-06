/**
 * localModelConsent.test.ts
 *
 * Guard rails for the opt-in gate on the on-device classifier:
 *   - nothing downloads or trains without an explicit grant
 *   - a decline is durable and never silently re-prompts
 *   - a grant is durable, so returning visitors are not asked again
 *   - blocked/absent localStorage degrades to "ask", never to "assume yes"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getConsent,
  setConsent,
  clearConsent,
  hasGrantedConsent,
  shouldPromptForConsent,
} from '../localModelConsent';

const KEY = 'chatbot-local-model-consent';

/** Minimal in-memory localStorage stand-in. */
function installStorage(): Storage {
  const map = new Map<string, string>();
  const store = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;

  vi.stubGlobal('window', { localStorage: store });
  return store;
}

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('default state — must not assume consent', () => {
  it('reports unset when nothing has been chosen', () => {
    expect(getConsent()).toBe('unset');
  });

  it('does not report granted by default', () => {
    // The whole point of the gate: no grant means no 1.1 MB download.
    expect(hasGrantedConsent()).toBe(false);
  });

  it('prompts when no choice has been recorded', () => {
    expect(shouldPromptForConsent()).toBe(true);
  });
});

describe('granting consent', () => {
  beforeEach(() => setConsent('granted'));

  it('persists the grant', () => {
    expect(getConsent()).toBe('granted');
    expect(hasGrantedConsent()).toBe(true);
  });

  it('stops prompting once granted', () => {
    expect(shouldPromptForConsent()).toBe(false);
  });

  it('survives a fresh read, so returning visitors are not re-asked', () => {
    expect(window.localStorage.getItem(KEY)).toBe('granted');
    expect(hasGrantedConsent()).toBe(true);
  });
});

describe('declining consent', () => {
  beforeEach(() => setConsent('declined'));

  it('persists the decline', () => {
    expect(getConsent()).toBe('declined');
  });

  it('never reports granted', () => {
    expect(hasGrantedConsent()).toBe(false);
  });

  it('does not re-prompt — a decline is respected', () => {
    expect(shouldPromptForConsent()).toBe(false);
  });
});

describe('clearing consent', () => {
  it('returns to the unset state and prompts again', () => {
    setConsent('granted');
    clearConsent();

    expect(getConsent()).toBe('unset');
    expect(hasGrantedConsent()).toBe(false);
    expect(shouldPromptForConsent()).toBe(true);
  });
});

describe('hostile storage values fail closed', () => {
  it.each(['yes', 'true', '1', '', 'GRANTED', 'null'])(
    'treats %o as unset rather than granted',
    raw => {
      window.localStorage.setItem(KEY, raw);
      expect(getConsent()).toBe('unset');
      expect(hasGrantedConsent()).toBe(false);
    }
  );
});

describe('unavailable storage', () => {
  it('degrades to unset when there is no window (SSR)', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', undefined);

    expect(getConsent()).toBe('unset');
    expect(hasGrantedConsent()).toBe(false);
  });

  it('does not throw when localStorage access is blocked', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        // Safari private browsing / blocked cookies behave like this.
        throw new Error('SecurityError: localStorage is not available');
      },
    });

    expect(() => getConsent()).not.toThrow();
    expect(getConsent()).toBe('unset');
    expect(() => setConsent('granted')).not.toThrow();
  });
});
