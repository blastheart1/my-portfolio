/**
 * Navigation model for the /edit admin surface.
 *
 * Single source of truth shared by the sidebar, the command palette, and the
 * mobile sheet. Previously the link list lived inline in AdminNav.tsx and
 * CONTENT_SECTIONS lived in layout.tsx (imported *from a layout file*, which
 * is awkward and couples the nav to a route module).
 *
 * Adding a page means adding one entry here — nothing else needs to know.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  FolderKanban,
  Tags,
  Image as ImageIcon,
  Bot,
  ToggleLeft,
} from 'lucide-react';

/** Sidebar grouping. Order here is the render order. */
export const NAV_GROUPS = ['content', 'site', 'system'] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  content: 'Content',
  site: 'Site',
  system: 'System',
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Omitted for top-level items rendered above the groups (Dashboard). */
  group?: NavGroup;
  /**
   * When set, the item is active for any pathname starting with this.
   * When omitted, activity requires an exact match — so /edit does not
   * light up for every child route.
   */
  matchPrefix?: string;
  /** Renders an expandable sub-tree of CONTENT_SECTIONS beneath the item. */
  hasSubTree?: boolean;
}

/** Section keys editable at /edit/content/[section]. */
export const CONTENT_SECTIONS = [
  'hero',
  'about',
  'experience',
  'skills',
  'projects',
  'services',
  'blog',
  'contact',
] as const;

export type ContentSection = (typeof CONTENT_SECTIONS)[number];

/** Type guard for an arbitrary route param. */
export function isContentSection(value: string): value is ContentSection {
  return (CONTENT_SECTIONS as readonly string[]).includes(value);
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/edit', label: 'Dashboard', icon: LayoutDashboard },

  {
    href: '/edit/content/hero',
    label: 'Content',
    icon: FileText,
    group: 'content',
    matchPrefix: '/edit/content',
    hasSubTree: true,
  },
  { href: '/edit/experience', label: 'Experience', icon: Briefcase, group: 'content' },
  { href: '/edit/projects', label: 'Projects', icon: FolderKanban, group: 'content' },
  { href: '/edit/services', label: 'Services', icon: Tags, group: 'content' },

  { href: '/edit/sections', label: 'Sections', icon: ToggleLeft, group: 'site' },
  { href: '/edit/images', label: 'Images', icon: ImageIcon, group: 'site' },

  { href: '/edit/chatbot', label: 'Chatbot', icon: Bot, group: 'system', matchPrefix: '/edit/chatbot' },
];

/** Items rendered above the groups. */
export const TOP_LEVEL_ITEMS = NAV_ITEMS.filter(i => !i.group);

export function itemsInGroup(group: NavGroup): NavItem[] {
  return NAV_ITEMS.filter(i => i.group === group);
}

/**
 * Is `item` the active nav entry for `pathname`?
 *
 * Exact match unless the item declares a matchPrefix — otherwise '/edit'
 * would be active on every admin page.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.matchPrefix
    ? pathname.startsWith(item.matchPrefix)
    : pathname === item.href;
}

/** The content section currently being edited, or null when elsewhere. */
export function activeContentSection(pathname: string): ContentSection | null {
  if (!pathname.startsWith('/edit/content/')) return null;
  const key = pathname.split('/')[3];
  return (CONTENT_SECTIONS as readonly string[]).includes(key)
    ? (key as ContentSection)
    : null;
}
