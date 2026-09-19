/**
 * normalize-content.test.ts
 *
 * Supports guard rail N12. The point of this module is that the legacy JSON
 * body shape reaches the page as markdown rather than as an HTML string, so
 * the tests that matter most are the ones proving markup in the stored content
 * survives as text — never as structure.
 *
 * The degenerate inputs are not hypothetical. These rows were written without
 * validation, so a body can be anything the model emitted that day.
 */

import { describe, it, expect } from 'vitest';

import { normalizeContent } from '../normalize-content';

describe('plain prose', () => {
  it('passes through untouched', () => {
    const content = 'First paragraph.\n\nSecond paragraph.';
    expect(normalizeContent(content)).toBe(content);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeContent('  Hello.  ')).toBe('Hello.');
  });

  it('preserves markdown already in the body', () => {
    const content = '## A heading\n\nWith **bold** text and a [link](https://example.com).';
    expect(normalizeContent(content)).toBe(content);
  });
});

describe('the legacy JSON body shape', () => {
  it('flattens introduction, body and conclusion into paragraphs', () => {
    const raw = JSON.stringify({
      introduction: 'The opening.',
      body: ['The middle.', 'More middle.'],
      conclusion: 'The close.',
    });

    expect(normalizeContent(raw)).toBe('The opening.\n\nThe middle.\n\nMore middle.\n\nThe close.');
  });

  it('keeps the order: introduction, body, conclusion', () => {
    const raw = JSON.stringify({
      conclusion: 'Last.',
      introduction: 'First.',
      body: ['Middle.'],
    });

    expect(normalizeContent(raw)).toBe('First.\n\nMiddle.\n\nLast.');
  });

  it('handles a partial object', () => {
    expect(normalizeContent(JSON.stringify({ introduction: 'Only this.' }))).toBe('Only this.');
    expect(normalizeContent(JSON.stringify({ body: ['Only this.'] }))).toBe('Only this.');
  });

  it('accepts a body that is a string rather than an array', () => {
    expect(normalizeContent(JSON.stringify({ body: 'One block.' }))).toBe('One block.');
  });

  it('drops blank and non-string entries instead of rendering them', () => {
    const raw = JSON.stringify({
      introduction: '   ',
      body: ['Real.', '', null, 42, '  '],
      conclusion: 'End.',
    });

    expect(normalizeContent(raw)).toBe('Real.\n\nEnd.');
  });
});

describe('inputs that must not blank the post', () => {
  it('returns the raw text when the JSON has none of the expected keys', () => {
    // Visible and reviewable beats silently empty.
    const raw = JSON.stringify({ something: 'else' });
    expect(normalizeContent(raw)).toBe(raw);
  });

  it('returns the raw text for a body that merely opens with a brace', () => {
    const content = '{ not json at all, just prose that starts oddly.';
    expect(normalizeContent(content)).toBe(content);
  });

  it('returns the raw text for a JSON array', () => {
    const raw = '["a", "b"]';
    expect(normalizeContent(raw)).toBe(raw);
  });

  it('returns an empty string for empty, whitespace, and non-string input', () => {
    expect(normalizeContent('')).toBe('');
    expect(normalizeContent('   \n ')).toBe('');
    expect(normalizeContent(null as unknown as string)).toBe('');
    expect(normalizeContent(undefined as unknown as string)).toBe('');
  });
});

describe('N12 — markup is carried as text, never as structure', () => {
  it('does not build HTML from the legacy shape', () => {
    // The old formatContent produced "<p class=...>…</p>" here and injected
    // it. Nothing in the output may be a tag we manufactured.
    const raw = JSON.stringify({ introduction: 'Hello.', body: ['World.'] });
    const result = normalizeContent(raw);

    expect(result).not.toMatch(/<p[\s>]/);
    expect(result).not.toMatch(/<div[\s>]/);
  });

  it('leaves an injected script tag as inert text for the renderer to escape', () => {
    const raw = JSON.stringify({ introduction: '<script>alert(1)</script>' });
    const result = normalizeContent(raw);

    // It survives as characters. react-markdown is what refuses to make it an
    // element; this module simply must not help it along.
    expect(result).toBe('<script>alert(1)</script>');
  });

  it('leaves an img onerror payload as text', () => {
    const raw = JSON.stringify({ body: ['<img src=x onerror="alert(1)">'] });
    expect(normalizeContent(raw)).toBe('<img src=x onerror="alert(1)">');
  });
});
