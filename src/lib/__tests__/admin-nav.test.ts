/**
 * admin-nav.test.ts
 *
 * Phase 0 of the admin redesign: nav config extracted to one place.
 *
 * The guard rail that matters is that extracting it changed nothing — the
 * same eight destinations, the same active-state behaviour the inline
 * `match` predicates had.
 */

import { describe, it, expect } from 'vitest';
import {
  NAV_ITEMS,
  NAV_GROUPS,
  TOP_LEVEL_ITEMS,
  CONTENT_SECTIONS,
  itemsInGroup,
  isNavItemActive,
  activeContentSection,
  isContentSection,
} from '../admin-nav';

describe('nav config parity with the previous inline list', () => {
  it('keeps exactly the eight original destinations', () => {
    expect(NAV_ITEMS.map(i => i.href)).toEqual([
      '/edit',
      '/edit/content/hero',
      '/edit/experience',
      '/edit/projects',
      '/edit/services',
      '/edit/sections',
      '/edit/images',
      '/edit/chatbot',
    ]);
  });

  it('gives every item a label and an icon', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label, item.href).toBeTruthy();
      expect(item.icon, item.href).toBeTruthy();
    }
  });

  it('has no duplicate hrefs', () => {
    const hrefs = NAV_ITEMS.map(i => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('active-state behaviour matches the old match() predicates', () => {
  const item = (href: string) => NAV_ITEMS.find(i => i.href === href)!;

  it('Dashboard is active only on exactly /edit', () => {
    // The old predicate was `p === '/edit'`. A prefix match here would light
    // up Dashboard on every admin page.
    expect(isNavItemActive(item('/edit'), '/edit')).toBe(true);
    expect(isNavItemActive(item('/edit'), '/edit/projects')).toBe(false);
    expect(isNavItemActive(item('/edit'), '/edit/content/hero')).toBe(false);
  });

  it('Content is active across every content sub-route', () => {
    const content = item('/edit/content/hero');
    expect(isNavItemActive(content, '/edit/content/hero')).toBe(true);
    expect(isNavItemActive(content, '/edit/content/contact')).toBe(true);
    expect(isNavItemActive(content, '/edit/projects')).toBe(false);
  });

  it('Chatbot is active across its sub-routes', () => {
    const bot = item('/edit/chatbot');
    expect(isNavItemActive(bot, '/edit/chatbot')).toBe(true);
    expect(isNavItemActive(bot, '/edit/chatbot/examples')).toBe(true);
  });

  it('exact-match items do not prefix-match', () => {
    expect(isNavItemActive(item('/edit/projects'), '/edit/projects/123')).toBe(false);
  });
});

describe('grouping', () => {
  it('puts Dashboard above the groups', () => {
    expect(TOP_LEVEL_ITEMS.map(i => i.href)).toEqual(['/edit']);
  });

  it('assigns every non-top-level item to a known group', () => {
    for (const item of NAV_ITEMS.filter(i => i.group)) {
      expect(NAV_GROUPS).toContain(item.group!);
    }
  });

  it('every group has at least one item (no empty headings render)', () => {
    for (const g of NAV_GROUPS) {
      expect(itemsInGroup(g).length, g).toBeGreaterThan(0);
    }
  });

  it('groups partition the non-top-level items exactly once', () => {
    const grouped = NAV_GROUPS.flatMap(g => itemsInGroup(g));
    expect(grouped.length).toBe(NAV_ITEMS.length - TOP_LEVEL_ITEMS.length);
    expect(new Set(grouped.map(i => i.href)).size).toBe(grouped.length);
  });
});

describe('content sections', () => {
  it('keeps the original eight in order', () => {
    expect([...CONTENT_SECTIONS]).toEqual([
      'hero', 'about', 'experience', 'skills',
      'projects', 'services', 'blog', 'contact',
    ]);
  });

  it('resolves the active section from a pathname', () => {
    expect(activeContentSection('/edit/content/hero')).toBe('hero');
    expect(activeContentSection('/edit/content/contact')).toBe('contact');
  });

  it('returns null off the content routes', () => {
    expect(activeContentSection('/edit/projects')).toBeNull();
    expect(activeContentSection('/edit')).toBeNull();
  });

  it('returns null for an unknown section rather than echoing it back', () => {
    // The route renders "Unknown section" for these; the nav must not
    // highlight a tab that does not exist.
    expect(activeContentSection('/edit/content/nope')).toBeNull();
  });

  it('guards arbitrary route params', () => {
    expect(isContentSection('hero')).toBe(true);
    expect(isContentSection('nope')).toBe(false);
    expect(isContentSection('')).toBe(false);
    expect(isContentSection('__proto__')).toBe(false);
  });

  it('the Content nav item declares a sub-tree', () => {
    expect(NAV_ITEMS.find(i => i.href === '/edit/content/hero')?.hasSubTree).toBe(true);
  });
});
