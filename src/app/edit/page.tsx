import Link from 'next/link';
import { AlertTriangle, EyeOff } from 'lucide-react';

import { NAV_ITEMS } from '@/lib/admin-nav';
import {
  getAllProjects,
  getAllServiceTiers,
  getAllExperienceEntries,
  getAllSections,
} from '@/lib/content-queries';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Counts must reflect the database as it is right now, not as it was at the
// last build. This page is admin-only and behind auth, so there is nothing to
// cache for anyone else anyway.
export const dynamic = 'force-dynamic';

interface Stat {
  href: string;
  label: string;
  value: number;
  /** Rendered under the number, e.g. "2 hidden". */
  detail?: string;
  tone?: 'warn';
}

/**
 * Dashboard.
 *
 * Previously six identical tiles with Unicode glyphs (⊞ ✏ ◈) and static copy —
 * it told the owner nothing they did not already know. It now answers the
 * questions actually worth asking on arrival: how much content is there, and
 * is anything hidden that I forgot about?
 */
export default async function EditDashboard() {
  // Each of these throws on a DB failure by design (they back admin screens,
  // where a silent empty list would look like data loss). Catch here so the
  // dashboard degrades to "unavailable" rather than erroring the whole page.
  const [projects, tiers, experience, sections] = await Promise.all([
    getAllProjects().catch(() => null),
    getAllServiceTiers().catch(() => null),
    getAllExperienceEntries().catch(() => null),
    getAllSections().catch(() => null),
  ]);

  const unavailable =
    projects === null || tiers === null || experience === null || sections === null;

  const hiddenSections = (sections ?? []).filter(s => !s.visible);

  const countHidden = <T extends { visible: boolean }>(rows: T[] | null) =>
    rows ? rows.filter(r => !r.visible).length : 0;

  const stats: Stat[] = [
    {
      href: '/edit/projects',
      label: 'Projects',
      value: projects?.length ?? 0,
      detail: countHidden(projects) > 0 ? `${countHidden(projects)} hidden` : undefined,
      tone: countHidden(projects) > 0 ? 'warn' : undefined,
    },
    {
      href: '/edit/experience',
      label: 'Experience',
      value: experience?.length ?? 0,
      detail: countHidden(experience) > 0 ? `${countHidden(experience)} hidden` : undefined,
      tone: countHidden(experience) > 0 ? 'warn' : undefined,
    },
    {
      href: '/edit/services',
      label: 'Service tiers',
      value: tiers?.length ?? 0,
      detail: countHidden(tiers) > 0 ? `${countHidden(tiers)} hidden` : undefined,
      tone: countHidden(tiers) > 0 ? 'warn' : undefined,
    },
    {
      href: '/edit/sections',
      label: 'Sections',
      value: sections?.length ?? 0,
      detail:
        hiddenSections.length > 0 ? `${hiddenSections.length} hidden` : 'all visible',
      tone: hiddenSections.length > 0 ? 'warn' : undefined,
    },
  ];

  // Everything except Dashboard itself.
  const destinations = NAV_ITEMS.filter(i => i.href !== '/edit');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your portfolio content.</p>
      </div>

      {unavailable && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Content counts unavailable</AlertTitle>
          <AlertDescription>
            The database could not be reached, so the numbers below may be wrong.
            Editing pages will show the specific error.
          </AlertDescription>
        </Alert>
      )}

      {hiddenSections.length > 0 && (
        <Alert variant="warn">
          <EyeOff aria-hidden="true" />
          <AlertTitle>
            {hiddenSections.length === 1
              ? '1 section is hidden from your site'
              : `${hiddenSections.length} sections are hidden from your site`}
          </AlertTitle>
          <AlertDescription>
            {hiddenSections.map(s => s.label).join(', ')} —{' '}
            <Link
              href="/edit/sections"
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              review visibility
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(stat => (
          <Link
            key={stat.href}
            href={stat.href}
            className="rounded-xl border border-border bg-card p-4 transition-colors
                       hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-ring"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-card-foreground">
              {stat.value}
            </p>
            {stat.detail && (
              <p
                className={
                  stat.tone === 'warn'
                    ? 'mt-0.5 text-xs text-warn'
                    : 'mt-0.5 text-xs text-muted-foreground'
                }
              >
                {stat.detail}
              </p>
            )}
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground">Everything else</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4
                           transition-colors hover:bg-secondary/50 focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium text-card-foreground">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
