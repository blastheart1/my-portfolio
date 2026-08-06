import { z } from 'zod';

/**
 * Mirrors the schema previously inline in src/app/api/admin/projects/route.ts.
 * Limits are the server's, unchanged — see src/lib/schemas/index.ts.
 */
export const ProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tech: z.array(z.string().max(100)).optional(),
  link: z.string().max(500).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
});

/** PATCH accepts any subset of the same fields. */
export const ProjectPatchSchema = ProjectSchema.partial();

export type ProjectInput = z.infer<typeof ProjectSchema>;
export type ProjectPatchInput = z.infer<typeof ProjectPatchSchema>;
