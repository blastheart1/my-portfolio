/**
 * og-url.test.ts
 *
 * The link-preview card is often the first thing anyone sees of this site, and
 * nothing about a broken one is visible from inside the app: it fails in
 * somebody else's chat window. So the URL a page advertises is asserted here,
 * and tests/e2e/seo.spec.ts fetches it to prove it resolves.
 */

import { describe, it, expect } from 'vitest';

import { ogImageUrl } from '../og-url';
import { SITE_URL } from '../site';

describe('ogImageUrl', () => {
  it('is absolute, because Open Graph consumers do not resolve relative URLs', () => {
    const url = ogImageUrl({ title: 'Relay' });
    expect(url.startsWith(`${SITE_URL}/api/og`)).toBe(true);
  });

  it('carries the title', () => {
    expect(new URL(ogImageUrl({ title: 'Relay' })).searchParams.get('title')).toBe('Relay');
  });

  it('omits the optional parts rather than sending empty ones', () => {
    const params = new URL(ogImageUrl({ title: 'Relay' })).searchParams;

    expect(params.has('subtitle')).toBe(false);
    expect(params.has('eyebrow')).toBe(false);
    expect(params.has('chips')).toBe(false);
  });

  it('joins chips into one parameter', () => {
    const params = new URL(
      ogImageUrl({ title: 'Relay', chips: ['Next.js', 'Whisper'] })
    ).searchParams;

    expect(params.get('chips')).toBe('Next.js,Whisper');
  });

  it('encodes text that would otherwise break the query string', () => {
    // Real titles contain ampersands, slashes and em dashes.
    const url = ogImageUrl({
      title: 'Rules & Models: AI/ML — a guide',
      subtitle: 'What now?',
      eyebrow: '~/work $ cat x',
    });

    const params = new URL(url).searchParams;
    expect(params.get('title')).toBe('Rules & Models: AI/ML — a guide');
    expect(params.get('subtitle')).toBe('What now?');
    expect(params.get('eyebrow')).toBe('~/work $ cat x');
  });

  it('round-trips through URL parsing without losing anything', () => {
    const input = { title: 'A & B', subtitle: 'x=1&y=2', chips: ['a,b'] };
    const params = new URL(ogImageUrl(input)).searchParams;

    expect(params.get('title')).toBe('A & B');
    expect(params.get('subtitle')).toBe('x=1&y=2');
  });
});
