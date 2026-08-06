'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';

import {
  NAV_GROUPS,
  NAV_GROUP_LABELS,
  TOP_LEVEL_ITEMS,
  CONTENT_SECTIONS,
  itemsInGroup,
  isNavItemActive,
  activeContentSection,
  type NavItem,
} from '@/lib/admin-nav';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import LogoutButton from './LogoutButton';

/**
 * Admin navigation shell.
 *
 * Three layouts from one nav model (see @/lib/admin-nav):
 *   - < md   : hidden; a top bar exposes a hamburger that opens a slide-over
 *   - md–lg  : icon-only rail (labels have nowhere to go at that width)
 *   - >= lg  : full sidebar, collapsible to the rail and remembered
 *
 * `showLabels` is a single explicit prop rather than a pile of conditional
 * `lg:` classes. The first version tried to express "rail below lg, and also
 * rail at lg when collapsed" by combining `hidden lg:inline` with a
 * conditional `lg:hidden` — twMerge sees those as the same variant+property
 * and keeps only the last, so labels resolved the wrong way. Two callers with
 * two explicit values is both correct and far easier to reason about.
 */

const COLLAPSE_KEY = 'admin.sidebar';
const RAIL_WIDTH = 'w-[4.25rem]';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Read persisted state after mount — reading localStorage during render
  // would mismatch the server-rendered HTML.
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'collapsed');
    setMounted(true);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? 'collapsed' : 'expanded');
      return next;
    });
  }, []);

  // Close the mobile sheet on navigation, otherwise it covers the page you
  // just asked for.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Cmd/Ctrl-B is handled globally in AdminShortcuts, which cannot reach this
  // component's state directly — it signals via a custom event instead.
  React.useEffect(() => {
    const onToggle = () => toggleCollapsed();
    window.addEventListener('admin:toggle-sidebar', onToggle);
    return () => window.removeEventListener('admin:toggle-sidebar', onToggle);
  }, [toggleCollapsed]);

  return (
    <>
      {/* Mobile top bar — below md the sidebar is not rendered at all. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          // 44px minimum touch target.
          className="flex size-11 items-center justify-center rounded-lg text-sidebar-foreground
                     transition-colors hover:bg-sidebar-accent focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <span className="text-sm font-semibold text-sidebar-foreground">Admin</span>
        <ThemeToggleButton />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left" title="Navigation">
        {/* Always labelled: the sheet has room, and an icon-only slide-over
            would be pointless. */}
        <NavTree pathname={pathname} showLabels showSubTree />
        <div className="mt-6 space-y-1 border-t border-sidebar-border pt-4">
          <ViewSiteLink showLabels />
          <LogoutButton />
        </div>
      </Sheet>

      <aside
        aria-label="Admin navigation"
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar',
          'md:flex',
          // Rail by default; only widens at lg, and only when not collapsed.
          RAIL_WIDTH,
          !collapsed && 'lg:w-60'
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
          <Link
            href="/edit"
            className="flex items-center gap-2 rounded-md text-sm font-semibold text-sidebar-foreground
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span aria-hidden="true" className="text-[var(--color-brand)]">✦</span>
            {!collapsed && <span className="hidden lg:inline">Admin</span>}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {/* One tree, not two. When collapsed the label is not rendered at
              all; otherwise it is rendered and CSS hides it below lg, where
              the rail has no room for it. Duplicating the tree per breakpoint
              would put every link in the accessibility tree twice. */}
          <NavTree
            pathname={pathname}
            showLabels={!collapsed}
            responsiveLabels
            showSubTree={!collapsed}
          />
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
          <ViewSiteLink showLabels={!collapsed} responsiveLabels />

          <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
            <ThemeToggleButton />
            {/* Collapse control only matters where the width can change. */}
            {mounted && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden size-9 items-center justify-center rounded-lg text-sidebar-foreground/70
                           transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:flex"
              >
                {collapsed ? (
                  <ChevronsRight className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {!collapsed && (
            <div className="hidden lg:block">
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

interface TreeProps {
  pathname: string;
  showLabels: boolean;
  showSubTree: boolean;
  /** Label is present in the DOM but hidden by CSS below lg (the rail). */
  responsiveLabels?: boolean;
}

function NavTree({ pathname, showLabels, showSubTree, responsiveLabels }: TreeProps) {
  return (
    <div className="space-y-4">
      <ul className="space-y-0.5">
        {TOP_LEVEL_ITEMS.map(item => (
          <li key={item.href}>
            <NavLink
              item={item}
              pathname={pathname}
              showLabel={showLabels}
              responsiveLabel={responsiveLabels}
            />
          </li>
        ))}
      </ul>

      {NAV_GROUPS.map(group => (
        <div key={group}>
          <p
            className={cn(
              'px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50',
              // In the rail the heading has nowhere to render, but it still
              // belongs in the accessibility tree.
              !showLabels ? 'sr-only' : responsiveLabels && 'sr-only lg:not-sr-only'
            )}
          >
            {NAV_GROUP_LABELS[group]}
          </p>
          <ul className="space-y-0.5">
            {itemsInGroup(group).map(item => (
              <li key={item.href}>
                <NavLink
              item={item}
              pathname={pathname}
              showLabel={showLabels}
              responsiveLabel={responsiveLabels}
            />
                {item.hasSubTree && showSubTree && (
                  <ContentSubTree pathname={pathname} responsive={responsiveLabels} />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NavLink({
  item,
  pathname,
  showLabel,
  responsiveLabel,
}: {
  item: NavItem;
  pathname: string;
  showLabel: boolean;
  responsiveLabel?: boolean;
}) {
  const active = isNavItemActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      // In the rail the icon is the only visible content, so the link still
      // needs a name.
      aria-label={showLabel ? undefined : item.label}
      title={item.label}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        !showLabel ? 'justify-center' : responsiveLabel && 'justify-center lg:justify-start',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      )}
    >
      {/* Brand colour is reserved for the active indicator — see §2. */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--color-brand)]"
        />
      )}
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {showLabel && (
        <span className={cn('truncate', responsiveLabel && 'hidden lg:inline')}>
          {item.label}
        </span>
      )}
    </Link>
  );
}

/** Expandable list of content sections beneath the Content item. */
function ContentSubTree({ pathname, responsive }: { pathname: string; responsive?: boolean }) {
  const active = activeContentSection(pathname);
  const [open, setOpen] = React.useState(active !== null);

  // Opening a content page from elsewhere should reveal the sub-tree.
  React.useEffect(() => {
    if (active !== null) setOpen(true);
  }, [active]);

  return (
    <div className={cn(responsive && 'hidden lg:block')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="mt-0.5 flex w-full items-center gap-1 rounded-md px-2 py-1 text-[11px]
                   text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <ChevronDown
          className={cn('size-3 transition-transform duration-150', !open && '-rotate-90')}
          aria-hidden="true"
        />
        Sections
      </button>

      {open && (
        <ul className="animate-admin-fade-up ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
          {CONTENT_SECTIONS.map(section => {
            const isActive = active === section;
            return (
              <li key={section}>
                <Link
                  href={`/edit/content/${section}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'block rounded-md px-2 py-1 text-xs capitalize transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isActive
                      ? 'font-medium text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  )}
                >
                  {section}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ViewSiteLink({
  showLabels,
  responsiveLabels,
}: {
  showLabels: boolean;
  responsiveLabels?: boolean;
}) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      title="View site"
      aria-label={showLabels ? undefined : 'View site'}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/80',
        'transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        !showLabels ? 'justify-center' : responsiveLabels && 'justify-center lg:justify-start'
      )}
    >
      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
      {showLabels && (
        <span className={cn('truncate', responsiveLabels && 'hidden lg:inline')}>
          View site
        </span>
      )}
    </a>
  );
}

/**
 * Theme toggle.
 *
 * Deliberately reuses the public site's mechanism — `localStorage.theme` plus
 * `.dark` on <html> — rather than introducing a second source of truth.
 */
function ThemeToggleButton() {
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    const next = !html.classList.contains('dark');
    html.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  // Render a placeholder until mounted so the icon cannot flash the wrong way.
  if (!mounted) return <span className="size-9" aria-hidden="true" />;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70
                 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
