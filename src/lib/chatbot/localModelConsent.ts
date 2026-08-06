/**
 * Consent gate for the on-device intent classifier.
 *
 * The chatbot works fully without TensorFlow: ChatWindow falls through to
 * POST /api/chatbot/generate whenever the local model is not ready. The local
 * model is a latency/cost optimisation, not a requirement — so it is opt-in.
 *
 * Loading it costs the visitor a ~1.1 MB download and, on the first ever grant,
 * an on-device training run. Both are real costs on a phone or metered
 * connection, which is why they now happen only on a deliberate choice.
 *
 * Consent is remembered so a returning visitor who opted in gets the cached
 * model loaded straight from IndexedDB with no prompt and no retraining.
 */

const CONSENT_KEY = 'chatbot-local-model-consent';

export type ConsentState = 'granted' | 'declined' | 'unset';

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    // Storage can throw in private-browsing / blocked-cookie contexts.
    return null;
  }
}

export function getConsent(): ConsentState {
  const store = safeLocalStorage();
  if (!store) return 'unset';

  const raw = store.getItem(CONSENT_KEY);
  return raw === 'granted' || raw === 'declined' ? raw : 'unset';
}

export function setConsent(state: Exclude<ConsentState, 'unset'>): void {
  safeLocalStorage()?.setItem(CONSENT_KEY, state);
}

/** Forget the choice — the visitor is asked again next time. */
export function clearConsent(): void {
  safeLocalStorage()?.removeItem(CONSENT_KEY);
}

export function hasGrantedConsent(): boolean {
  return getConsent() === 'granted';
}

/**
 * Should the opt-in prompt be shown? Only when no choice has been recorded —
 * a decline is respected and never re-asked automatically.
 */
export function shouldPromptForConsent(): boolean {
  return getConsent() === 'unset';
}
