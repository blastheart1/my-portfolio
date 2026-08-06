import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const alias = { '@': path.resolve(__dirname, './src') };

/**
 * Two projects rather than one shared environment.
 *
 * The lib suites must run in `node`: jose's JWT verification uses Node's
 * WebCrypto, and jsdom's globals break it. Component suites need a DOM. A
 * single environment cannot satisfy both.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 80 },
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.tsx', 'src/**/__tests__/**/*.test.tsx'],
        },
      },
    ],
  },
});
