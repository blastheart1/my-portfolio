'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS, type NavItem } from '@/lib/nav-items';

/**
 * The nav entries whose section is actually on the page.
 *
 * Sections hidden from /edit/sections are not rendered at all — page.tsx gates
 * each one on `show(id)` — so a link to one scrolled nowhere and silently did
 * nothing. Rather than plumbing the visibility map from the database through
 * the root layout (which is a client component with no query access), this
 * reads the rendered DOM, which is the same fact one step later and cannot
 * drift from what the visitor can actually reach.
 *
 * It also handles the cases a visibility map would not: pages other than the
 * home page, where almost none of these sections exist.
 *
 * Starts with the full list and narrows after mount. The menus are closed on
 * first render, so nothing wrong is ever on screen; starting empty would risk
 * a flash of a menu with no entries.
 */
export function useVisibleNavItems(): NavItem[] {
  const pathname = usePathname();
  const [items, setItems] = useState<NavItem[]>(NAV_ITEMS);

  useEffect(() => {
    setItems(NAV_ITEMS.filter(item => document.getElementById(item.id) !== null));
  }, [pathname]);

  return items;
}
