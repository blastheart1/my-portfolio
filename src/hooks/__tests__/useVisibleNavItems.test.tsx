/**
 * useVisibleNavItems.test.tsx
 *
 * Sections switched off in /edit/sections are not rendered at all, but the nav
 * kept listing them. Clicking one called scrollIntoView on a null element and
 * did nothing, with no indication why.
 *
 * The hook derives the menu from the rendered DOM rather than from the
 * database visibility map, so it cannot claim a destination the visitor has no
 * way to reach.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useVisibleNavItems } from '../useVisibleNavItems';
import { NAV_ITEMS } from '@/lib/nav-items';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

function renderSections(...ids: string[]) {
  for (const id of ids) {
    const el = document.createElement('section');
    el.id = id;
    document.body.appendChild(el);
  }
}

beforeEach(() => {
  pathname = '/';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('menu matches what is on the page', () => {
  it('keeps every entry when all sections are rendered', () => {
    renderSections(...NAV_ITEMS.map(i => i.id));

    const { result } = renderHook(() => useVisibleNavItems());

    expect(result.current.map(i => i.id)).toEqual(NAV_ITEMS.map(i => i.id));
  });

  it('drops entries whose section was hidden in the admin', () => {
    renderSections('home', 'about', 'projects', 'contact');

    const { result } = renderHook(() => useVisibleNavItems());

    expect(result.current.map(i => i.id)).toEqual(['home', 'about', 'projects', 'contact']);
  });

  it('does not list a hidden section such as blog or services', () => {
    renderSections('home', 'about');

    const { result } = renderHook(() => useVisibleNavItems());
    const ids = result.current.map(i => i.id);

    expect(ids).not.toContain('blog');
    expect(ids).not.toContain('services');
  });

  it('preserves page order rather than DOM insertion order', () => {
    renderSections('contact', 'about', 'home');

    const { result } = renderHook(() => useVisibleNavItems());

    expect(result.current.map(i => i.id)).toEqual(['home', 'about', 'contact']);
  });

  it('returns nothing on a page with none of these sections', () => {
    pathname = '/website-workflow';

    const { result } = renderHook(() => useVisibleNavItems());

    expect(result.current).toEqual([]);
  });
});

describe('every entry points at a real destination', () => {
  it('resolves each returned id to an element that can be scrolled to', () => {
    renderSections('home', 'skills', 'lab');

    const { result } = renderHook(() => useVisibleNavItems());

    for (const item of result.current) {
      expect(document.getElementById(item.id)).not.toBeNull();
    }
  });
});
