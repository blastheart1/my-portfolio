import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Required for React 19's act() support in a test environment.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Unmount between cases so a leaked portal (dialog, sheet, toast viewport)
// from one test cannot be found by the next.
afterEach(() => {
  cleanup();
});
