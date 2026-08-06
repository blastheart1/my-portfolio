'use client';

import * as React from 'react';

import { counterTone } from '@/lib/schemas';
import { cn } from '@/lib/utils';

/**
 * Character counter and inline field error.
 *
 * The limit here is a *presentation* limit — the length at which the value
 * starts breaking the public site's layout — not the schema limit. Exceeding
 * it never blocks a save; it just stops being a good idea. See
 * src/lib/schemas/index.ts.
 */
interface FieldMetaProps {
  value: string;
  limit?: number;
  error?: string;
  hint?: string;
  className?: string;
}

export default function FieldMeta({ value, limit, error, hint, className }: FieldMetaProps) {
  const length = value?.length ?? 0;
  const tone = limit ? counterTone(length, limit) : 'normal';

  return (
    <div className={cn('mt-1 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>

      {limit !== undefined && (
        <span
          className={cn(
            'shrink-0 tabular-nums text-[11px]',
            tone === 'normal' && 'text-muted-foreground',
            tone === 'warn' && 'text-warn',
            tone === 'over' && 'text-destructive'
          )}
          // The colour change is the primary signal for sighted users; this
          // makes the same information available to everyone else.
          aria-label={
            tone === 'over'
              ? `${length} of ${limit} characters — over the recommended length`
              : `${length} of ${limit} characters`
          }
        >
          {length}/{limit}
        </span>
      )}
    </div>
  );
}
