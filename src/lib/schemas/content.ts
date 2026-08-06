import { z } from 'zod';

/**
 * Section copy is a free-form key/value bag, so the schema constrains shape
 * rather than field names — a section can grow a new field without a code
 * change, which is the point of the section_content table.
 *
 * Mirrors src/app/api/admin/content/[section]/route.ts exactly: `fields` is a
 * record (key → value), NOT a list of {field_key, field_value} objects. The
 * PATCH handler iterates Object.entries(fields), so the shape matters.
 */
export const ContentPatchSchema = z.object({
  fields: z.record(z.string().min(1).max(100), z.string().max(10000)),
});

/** Site settings PATCH — mirrors src/app/api/admin/settings/route.ts. */
export const SettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(500),
});

export type ContentPatchInput = z.infer<typeof ContentPatchSchema>;
export type SettingInput = z.infer<typeof SettingSchema>;
