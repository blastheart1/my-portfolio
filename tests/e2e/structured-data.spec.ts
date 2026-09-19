/**
 * structured-data.spec.ts
 *
 * Guard rail P6 — the JSON-LD graph is in the server HTML and scoped per route.
 *
 * Read from the raw response body, never from the DOM. That is not a style
 * preference: if StructuredData were ever made a client component, React would
 * inject the script on hydration and a DOM-based assertion would still pass
 * while the graph was absent for every crawler and every model. The unit test
 * (N15) forbids 'use client' in that file; this proves the consequence.
 */

import { test, expect } from '@playwright/test';

interface Node {
  '@type'?: string;
  '@id'?: string;
  [key: string]: unknown;
}

async function graphFor(request: { get: (url: string) => Promise<{ text(): Promise<string> }> }, path: string): Promise<Node[]> {
  const html = await (await request.get(path)).text();

  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ].map(match => match[1]);

  return blocks.flatMap(block => {
    const parsed = JSON.parse(block);
    return parsed['@graph'] ?? [parsed];
  });
}

function typesIn(nodes: Node[]): string[] {
  return nodes.map(node => node['@type'] ?? '').filter(Boolean);
}

test.describe('P6 — the graph is server-rendered and correctly scoped', () => {
  test('the identity nodes appear on every route', async ({ request }) => {
    for (const path of ['/', '/work', '/work/relay', '/blog']) {
      const types = typesIn(await graphFor(request, path));

      expect(types, path).toContain('Person');
      expect(types, path).toContain('WebSite');
    }
  });

  test('ProfilePage and FAQPage appear on the home page', async ({ request }) => {
    const types = typesIn(await graphFor(request, '/'));

    expect(types).toContain('ProfilePage');
    expect(types).toContain('FAQPage');
  });

  test('and nowhere else', async ({ request }) => {
    // Duplicated FAQ markup across URLs gets discounted, and a ProfilePage
    // claiming to be the home page weakens the entity signal on exactly the
    // pages most worth citing.
    for (const path of ['/work', '/work/relay', '/website-workflow', '/blog']) {
      const types = typesIn(await graphFor(request, path));

      expect(types, `${path} still carries ProfilePage`).not.toContain('ProfilePage');
      expect(types, `${path} still carries FAQPage`).not.toContain('FAQPage');
    }
  });

  test('a case study carries its own CreativeWork, naming its own URL', async ({ request }) => {
    const nodes = await graphFor(request, '/work/relay');
    const work = nodes.find(node => node['@type'] === 'CreativeWork');

    expect(work).toBeDefined();
    expect(String(work!['@id'])).toContain('/work/relay');
  });

  test('every page emits a breadcrumb except the home page', async ({ request }) => {
    for (const path of ['/work', '/work/relay', '/blog']) {
      const types = typesIn(await graphFor(request, path));
      expect(types, path).toContain('BreadcrumbList');
    }
  });

  test('the Person node is the one thing everything else points at', async ({ request }) => {
    const nodes = await graphFor(request, '/');
    const person = nodes.find(node => node['@type'] === 'Person');

    expect(person?.['@id']).toBeTruthy();

    const profile = nodes.find(node => node['@type'] === 'ProfilePage');
    expect(profile?.mainEntity).toEqual({ '@id': person!['@id'] });
  });

  test('the graph parses as valid JSON on every route', async ({ request }) => {
    // A template-literal slip produces markup that looks fine and is silently
    // discarded by every consumer.
    for (const path of ['/', '/work', '/work/relay', '/blog', '/website-workflow']) {
      await expect(graphFor(request, path), path).resolves.toBeDefined();
    }
  });
});
