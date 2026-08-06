/**
 * tensorflowLazy.test.ts
 *
 * Guard rail N9 — TensorFlow must not load on initial page paint.
 *
 * This is a *source-and-contract* suite rather than a behavioural snapshot of
 * the classifier. Training the real model in a test process needs a tfjs
 * backend, IndexedDB, localStorage and a live DB read for approved examples —
 * an amount of machinery whose own failure modes would swamp the signal. What
 * actually regresses here is the lazy boundary, so that is what is pinned:
 *
 *   - importing the module must not pull in @tensorflow/tfjs
 *   - the import must be dynamic and memoised
 *   - teardown must never be what triggers the download
 *   - no component on the initial render path may import the model
 *
 * Classifier accuracy is covered separately by guardRails.test.ts (input
 * handling) and by the Playwright chatbot journey (end-to-end answering).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');
const MODEL_SRC = readFileSync(
  path.join(SRC, 'lib/chatbot/tensorflowModel.ts'),
  'utf8'
);

describe('N9 — the TF import is lazy', () => {
  beforeEach(async () => {
    const mod = await import('../tensorflowModel');
    mod.__resetTfForTests();
  });

  it('does not load TensorFlow merely by importing the module', async () => {
    const { __tfLoaded } = await import('../tensorflowModel');
    expect(__tfLoaded()).toBe(false);
  });

  it('does not load TensorFlow when a service is constructed', async () => {
    const { TensorFlowService, __tfLoaded } = await import('../tensorflowModel');
    // Construction happens during React render — it must stay cheap.
    new TensorFlowService(0.75);
    expect(__tfLoaded()).toBe(false);
  });

  it('does not load TensorFlow from cleanup()', async () => {
    const { TensorFlowService, __tfLoaded } = await import('../tensorflowModel');
    const svc = new TensorFlowService(0.75);

    // Teardown on a service that never trained must not fetch 1.1 MB just to
    // dispose nothing.
    svc.cleanup();
    expect(__tfLoaded()).toBe(false);
  });

  it('reports not-ready without a model, without loading TF', async () => {
    const { TensorFlowService, __tfLoaded } = await import('../tensorflowModel');
    const svc = new TensorFlowService(0.75);
    expect(svc.isModelReady()).toBe(false);
    expect(__tfLoaded()).toBe(false);
  });
});

describe('N9 — source-level guarantees', () => {
  it('has no static top-level runtime import of @tensorflow/tfjs', () => {
    // A type-only import is fine — it is erased at compile time.
    const staticRuntimeImport =
      /^import\s+(?!type\s)[^;]*from\s+['"]@tensorflow\/tfjs['"]/m;

    expect(
      staticRuntimeImport.test(MODEL_SRC),
      'A static `import * as tf from "@tensorflow/tfjs"` puts 1.1 MB back on ' +
        'the critical path. Use the memoised getTf() helper instead.'
    ).toBe(false);
  });

  it('imports the types as type-only', () => {
    expect(MODEL_SRC).toMatch(
      /import\s+type\s+\*\s+as\s+TF\s+from\s+['"]@tensorflow\/tfjs['"]/
    );
  });

  it('loads TF through a dynamic import', () => {
    expect(MODEL_SRC).toMatch(/import\(['"]@tensorflow\/tfjs['"]\)/);
  });

  it('memoises the dynamic import so concurrent callers share one fetch', () => {
    expect(MODEL_SRC).toContain('tfPromise');
    // The promise is assigned once and reused, not re-created per call.
    expect(MODEL_SRC).toMatch(/if\s*\(!tfPromise\)/);
  });

  it('cleanup uses the non-loading peek helper', () => {
    expect(MODEL_SRC).toMatch(/peekTf\(\)\?\./);
  });
});

describe('N9 — nothing on the initial render path imports the model', () => {
  const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8');

  /**
   * Extract only what a module actually imports. Comparing raw file text would
   * flag the explanatory comments in these files, which name the very modules
   * they are documenting the absence of.
   */
  function importSpecifiers(src: string): string[] {
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    return [
      ...stripped.matchAll(/(?:^import\s[^;]*?from\s*|import\(\s*)['"]([^'"]+)['"]/gm),
    ].map(m => m[1]);
  }

  it('PortfolioChatbotWrapper does not statically import Chatbot or the model', () => {
    const src = read('components/PortfolioChatbotWrapper.tsx');

    // Chatbot must arrive via next/dynamic, not a static import.
    expect(src).not.toMatch(/^import\s+\{?\s*Chatbot/m);
    expect(src).toMatch(/dynamic\(/);

    const statics = [
      ...src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
        .matchAll(/^import\s[^;]*?from\s*['"]([^'"]+)['"]/gm),
    ].map(m => m[1]);

    expect(statics).not.toContain('@tensorflow/tfjs');
    expect(statics.some(s => s.includes('tensorflowModel'))).toBe(false);
    // Chatbot itself must not be a static import — only a dynamic one.
    expect(statics.some(s => /\/Chatbot$/.test(s))).toBe(false);
  });

  it('the wrapper gates the mount behind a first open', () => {
    const src = read('components/PortfolioChatbotWrapper.tsx');
    expect(src).toContain('everOpened');
    // The launcher renders before the gate opens.
    expect(src).toMatch(/if\s*\(!everOpened\)/);
  });

  it('ChatLauncher pulls in no chatbot services', () => {
    const imports = importSpecifiers(read('components/chatbot/ChatLauncher.tsx'));

    expect(imports).not.toContain('@tensorflow/tfjs');
    expect(imports.some(s => s.includes('tensorflowModel'))).toBe(false);
    expect(imports.some(s => s.includes('openaiService'))).toBe(false);
    expect(imports.some(s => s.includes('ChatWindow'))).toBe(false);

    // Positively: it should only need React and framer-motion.
    expect(imports.sort()).toEqual(['framer-motion', 'react']);
  });

  it('ClientLayoutContent reaches the chatbot only through the wrapper', () => {
    const src = read('components/ClientLayoutContent.tsx');
    expect(src).toContain('PortfolioChatbotWrapper');
    expect(src).not.toContain('tensorflowModel');
    expect(src).not.toMatch(/from\s+['"].\/chatbot\/Chatbot['"]/);
  });
});

describe('consent gate — TF is never brought up unasked', () => {
  const chatbotSrc = readFileSync(
    path.join(SRC, 'components/chatbot/Chatbot.tsx'),
    'utf8'
  );

  it('checks recorded consent before initialising', () => {
    expect(chatbotSrc).toContain('getConsent()');
  });

  it('only auto-initialises when consent was already granted', () => {
    // The mount effect must gate on 'granted' — never call initializeModel
    // unconditionally.
    expect(chatbotSrc).toMatch(/consent\s*===\s*['"]granted['"]/);
  });

  it('records the choice when the visitor accepts or declines', () => {
    expect(chatbotSrc).toMatch(/setConsent\(\s*['"]granted['"]\s*\)/);
    expect(chatbotSrc).toMatch(/setConsent\(\s*['"]declined['"]\s*\)/);
  });

  it('training is only reachable from the consent-gated initialiser', () => {
    // trainModel must not be called from anywhere else in the component.
    const calls = [...chatbotSrc.matchAll(/trainModel\(/g)];
    expect(calls.length).toBe(1);
  });

  it('surfaces progress through the toast rather than blocking', () => {
    expect(chatbotSrc).toContain('setToastPhase');
    expect(chatbotSrc).toContain('setTrainingProgress');
  });

  it('keeps the chat usable when initialisation fails', () => {
    // On error the model is marked not-ready so ChatWindow falls through to
    // the server route, rather than being marked ready with no model.
    expect(chatbotSrc).toMatch(/catch[\s\S]{0,200}setIsModelReady\(false\)/);
  });
});

describe('training must yield so the progress toast can render', () => {
  it('calls tf.nextFrame between batches', () => {
    // Without this, model.fit() holds the main thread for the whole run and
    // the toast cannot paint or animate — it would appear frozen.
    expect(MODEL_SRC).toMatch(/onBatchEnd[\s\S]{0,120}tf\.nextFrame\(\)/);
  });

  it('reports per-epoch progress to the caller', () => {
    expect(MODEL_SRC).toMatch(/onProgress\?\.\(/);
    expect(MODEL_SRC).toContain('totalEpochs');
  });

  it('accepts an optional progress callback', () => {
    expect(MODEL_SRC).toMatch(
      /async trainModel\(onProgress\?: TrainingProgressCallback\)/
    );
  });

  it('still early-stops on a loss plateau', () => {
    expect(MODEL_SRC).toContain('stopTraining = true');
  });
});

describe('N10 — no interval runs while the performance monitor is hidden', () => {
  const src = readFileSync(
    path.join(SRC, 'components/chatbot/Chatbot.tsx'),
    'utf8'
  );

  it('guards the stats effect on showPerformanceMonitor', () => {
    expect(src).toMatch(/if\s*\(!showPerformanceMonitor\)\s*return;/);
  });

  it('includes showPerformanceMonitor in the effect dependencies', () => {
    // Otherwise toggling the monitor would not start or stop polling.
    expect(src).toMatch(
      /\[tensorflowService,\s*openaiService,\s*showPerformanceMonitor\]/
    );
  });

  it('still clears the interval on teardown', () => {
    expect(src).toContain('clearInterval(statsInterval)');
  });

  it('has no leftover empty debug effect', () => {
    // The old `if (apiKey && ...) { } else { }` block with two empty branches.
    expect(src).not.toMatch(/\}\s*else\s*\{\s*\}/);
  });
});
