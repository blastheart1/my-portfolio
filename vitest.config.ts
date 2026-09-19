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
    /**
     * Coverage.
     *
     * Two things were wrong here before CI existed to notice.
     *
     * `@vitest/coverage-v8` was never installed, so `npm run test:coverage`
     * did not run at all — it exited with MISSING DEPENDENCY. The 80% line
     * threshold below it had therefore never been evaluated once.
     *
     * And with no `include`, v8 only reports on files some test happens to
     * import. A new module with no tests would not appear in the denominator
     * at all, so the percentage could not fall when untested code was added —
     * which is the one thing a coverage threshold exists to detect. `include`
     * now names the source tree, so unreached files count as zero.
     *
     * The global figure is a ratchet at the real measured baseline, not an
     * aspiration. Raise it when it is genuinely exceeded; never lower it to
     * make a build pass. The directories carrying this project's guard rails
     * are held far higher, because "the repo averages 60-something" is not an
     * argument for shipping an unproven publish gate.
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/types/**',
        'src/**/*.d.ts',
        // Static data, not logic: JSON intent corpora and seed fixtures.
        'src/lib/chatbot/data/**',
      ],
      thresholds: {
        // Measured baseline on 2026-09-19 was 29.87% across the whole source
        // tree. The previous `80` was never evaluated, so this is not a
        // loosening of a standard that was being met — it is the first honest
        // number this project has had.
        lines: 29,
        'src/lib/blog/**': { lines: 90, functions: 90, branches: 80 },
        'src/lib/llm/**': { lines: 90, functions: 90, branches: 80 },
      },
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
