import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Required for React 19's act() support in a test environment.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement matchMedia, and anything reading a media query
// (usePrefersReducedMotion, and the components that gate animation on it)
// throws on render without this. Defaults to "not matching", which is the
// same starting point as a real browser with no preference set. Individual
// suites override it when they need a query to match.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Unmount between cases so a leaked portal (dialog, sheet, toast viewport)
// from one test cannot be found by the next.
afterEach(() => {
  cleanup();
});
