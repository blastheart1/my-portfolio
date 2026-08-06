import { z } from 'zod';

/** ISO calendar date, matching the column format used by experience_entries. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/**
 * Mirrors the schema previously inline in
 * src/app/api/admin/experience/route.ts. Limits unchanged.
 */
export const ExperienceSchema = z.object({
  track: z.string().min(1).max(50),
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  start_date: isoDate,
  end_date: isoDate.nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  detail_body: z.string().max(5000).optional(),
});

export const ExperiencePatchSchema = ExperienceSchema.partial();

export type ExperienceInput = z.infer<typeof ExperienceSchema>;
export type ExperiencePatchInput = z.infer<typeof ExperiencePatchSchema>;
