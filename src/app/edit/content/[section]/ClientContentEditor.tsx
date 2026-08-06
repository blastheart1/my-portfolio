'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

import ContentEditor from '@/components/admin/ContentEditor';
import AdminResource from '@/components/admin/AdminResource';
import EmptyState from '@/components/admin/EmptyState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonForm } from '@/components/ui/skeleton';
import { useAdminFetch } from '@/hooks/useAdminFetch';

// Sections that have a dedicated full editor elsewhere
const DEDICATED_EDITORS: Record<string, { href: string; label: string }> = {
  services:   { href: '/edit/services',   label: 'Edit service tiers (pricing, features) →' },
  experience: { href: '/edit/experience', label: 'Edit experience entries →' },
};

interface Props {
  section: string;
}

/** The endpoint returns a key/value bag; anything else is a failed load. */
function selectFields(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  throw new Error('Unexpected response shape');
}

export default function ClientContentEditor({ section }: Props) {
  const state = useAdminFetch<Record<string, string>>(
    `/api/admin/content/${section}`,
    { select: selectFields }
  );

  const dedicated = DEDICATED_EDITORS[section];

  return (
    <AdminResource state={state} loadingFallback={<SkeletonForm fields={4} />}>
      {fields => (
        <div className="space-y-4">
          {dedicated && (
            <Alert>
              <AlertDescription>
                This page edits the section heading only.{' '}
                <Link
                  href={dedicated.href}
                  className="font-medium underline underline-offset-2 hover:no-underline"
                >
                  {dedicated.label}
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {Object.keys(fields).length === 0 ? (
            <EmptyState
              icon={FileText}
              title={`No content fields for “${section}” yet`}
              description="Run the seed script to populate initial values for this section."
            />
          ) : (
            <ContentEditor section={section} initialFields={fields} />
          )}
        </div>
      )}
    </AdminResource>
  );
}
