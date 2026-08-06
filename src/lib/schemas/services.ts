import { z } from 'zod';

/**
 * Mirrors the schema previously inline in
 * src/app/api/admin/services/route.ts. Limits unchanged — note max 8 features,
 * which is a real server constraint, not just a counter limit.
 */
export const ServiceTierSchema = z.object({
  name: z.string().min(1).max(50),
  tagline: z.string().max(80).optional().default(''),
  outcome: z.string().max(300).optional().default(''),
  price_php: z.number().int().min(0),
  price_usd: z.number().int().min(0),
  features: z.array(z.string().max(100)).max(8).default([]),
  is_popular: z.boolean().default(false),
  visible: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const ServiceTierPatchSchema = ServiceTierSchema.partial();

export type ServiceTierInput = z.infer<typeof ServiceTierSchema>;
export type ServiceTierPatchInput = z.infer<typeof ServiceTierPatchSchema>;
