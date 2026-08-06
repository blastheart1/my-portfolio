/**
 * schemas.test.ts
 *
 * Phase 0 of the admin redesign: validation schemas lifted out of the route
 * handlers so client forms can use the same rules.
 *
 * The guard rail: the lift must not have changed what the API accepts. The
 * redesign brief forbids API contract changes, and tightening a limit here
 * would start rejecting rows already in the database. Every bound below is
 * asserted against the value the route enforced before the move.
 */

import { describe, it, expect } from 'vitest';
import {
  ProjectSchema,
  ExperienceSchema,
  ServiceTierSchema,
  ContentPatchSchema,
  SettingSchema,
  FIELD_LIMITS,
  counterTone,
} from '../schemas';

const str = (n: number) => 'x'.repeat(n);

describe('ProjectSchema — unchanged server bounds', () => {
  it('accepts a minimal valid project', () => {
    expect(ProjectSchema.safeParse({ title: 'A' }).success).toBe(true);
  });

  it('requires a non-empty title', () => {
    expect(ProjectSchema.safeParse({ title: '' }).success).toBe(false);
    expect(ProjectSchema.safeParse({}).success).toBe(false);
  });

  it('allows a 200-char title and rejects 201', () => {
    expect(ProjectSchema.safeParse({ title: str(200) }).success).toBe(true);
    expect(ProjectSchema.safeParse({ title: str(201) }).success).toBe(false);
  });

  it('allows a 2000-char description and rejects 2001', () => {
    expect(ProjectSchema.safeParse({ title: 'A', description: str(2000) }).success).toBe(true);
    expect(ProjectSchema.safeParse({ title: 'A', description: str(2001) }).success).toBe(false);
  });

  it('accepts null link and image_url', () => {
    const r = ProjectSchema.safeParse({ title: 'A', link: null, image_url: null });
    expect(r.success).toBe(true);
  });

  it('rejects a negative sort_order', () => {
    expect(ProjectSchema.safeParse({ title: 'A', sort_order: -1 }).success).toBe(false);
  });
});

describe('ExperienceSchema — unchanged server bounds', () => {
  const base = { track: 'eng', role: 'Dev', company: 'Acme', start_date: '2024-01-01' };

  it('accepts a valid entry', () => {
    expect(ExperienceSchema.safeParse(base).success).toBe(true);
  });

  it('requires ISO dates', () => {
    expect(ExperienceSchema.safeParse({ ...base, start_date: '01/01/2024' }).success).toBe(false);
    expect(ExperienceSchema.safeParse({ ...base, start_date: '2024-1-1' }).success).toBe(false);
  });

  it('allows a null end_date for current roles', () => {
    expect(ExperienceSchema.safeParse({ ...base, end_date: null }).success).toBe(true);
  });

  it('keeps the 5000-char detail_body bound', () => {
    expect(ExperienceSchema.safeParse({ ...base, detail_body: str(5000) }).success).toBe(true);
    expect(ExperienceSchema.safeParse({ ...base, detail_body: str(5001) }).success).toBe(false);
  });

  it('requires role and company', () => {
    expect(ExperienceSchema.safeParse({ ...base, role: '' }).success).toBe(false);
    expect(ExperienceSchema.safeParse({ ...base, company: '' }).success).toBe(false);
  });
});

describe('ServiceTierSchema — unchanged server bounds', () => {
  const base = { name: 'Starter', price_php: 0, price_usd: 0 };

  it('accepts a valid tier and applies defaults', () => {
    const r = ServiceTierSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.features).toEqual([]);
      expect(r.data.is_popular).toBe(false);
      expect(r.data.visible).toBe(true);
      expect(r.data.sort_order).toBe(0);
    }
  });

  it('enforces the 8-feature ceiling (a real server constraint)', () => {
    expect(ServiceTierSchema.safeParse({ ...base, features: Array(8).fill('f') }).success).toBe(true);
    expect(ServiceTierSchema.safeParse({ ...base, features: Array(9).fill('f') }).success).toBe(false);
  });

  it('keeps the 50-char name bound', () => {
    expect(ServiceTierSchema.safeParse({ ...base, name: str(50) }).success).toBe(true);
    expect(ServiceTierSchema.safeParse({ ...base, name: str(51) }).success).toBe(false);
  });

  it('requires prices and rejects negatives', () => {
    expect(ServiceTierSchema.safeParse({ name: 'A', price_usd: 0 }).success).toBe(false);
    expect(ServiceTierSchema.safeParse({ ...base, price_php: -1 }).success).toBe(false);
  });
});

describe('ContentPatchSchema — record shape, not a list', () => {
  it('accepts a key/value map', () => {
    // The PATCH handler does Object.entries(fields), so the shape matters.
    expect(ContentPatchSchema.safeParse({ fields: { heading: 'Hi' } }).success).toBe(true);
  });

  it('rejects an array of field objects', () => {
    const wrong = { fields: [{ field_key: 'heading', field_value: 'Hi' }] };
    expect(ContentPatchSchema.safeParse(wrong).success).toBe(false);
  });

  it('keeps the 10000-char value bound', () => {
    expect(ContentPatchSchema.safeParse({ fields: { a: str(10000) } }).success).toBe(true);
    expect(ContentPatchSchema.safeParse({ fields: { a: str(10001) } }).success).toBe(false);
  });

  it('rejects an empty key', () => {
    expect(ContentPatchSchema.safeParse({ fields: { '': 'v' } }).success).toBe(false);
  });
});

describe('SettingSchema', () => {
  it('accepts a key/value pair within bounds', () => {
    expect(SettingSchema.safeParse({ key: 'splash_enabled', value: 'true' }).success).toBe(true);
  });

  it('keeps the 500-char value bound', () => {
    expect(SettingSchema.safeParse({ key: 'k', value: str(500) }).success).toBe(true);
    expect(SettingSchema.safeParse({ key: 'k', value: str(501) }).success).toBe(false);
  });
});

describe('soft counter limits are advisory, not validation', () => {
  it('the display limit is tighter than the schema limit', () => {
    // If these ever inverted, the counter would show "over" on values the
    // server happily accepts, or vice versa.
    expect(FIELD_LIMITS.project.title).toBeLessThan(200);
    expect(FIELD_LIMITS.project.description).toBeLessThan(2000);
    expect(FIELD_LIMITS.serviceTier.name).toBeLessThan(50);
  });

  it('a value over the soft limit still validates', () => {
    const long = str(FIELD_LIMITS.project.title + 10);
    expect(ProjectSchema.safeParse({ title: long }).success).toBe(true);
  });

  it('the feature ceiling matches the schema, since that one IS enforced', () => {
    expect(FIELD_LIMITS.serviceTier.maxFeatures).toBe(8);
  });
});

describe('counterTone', () => {
  it('is normal well under the limit', () => {
    expect(counterTone(0, 100)).toBe('normal');
    expect(counterTone(84, 100)).toBe('normal');
  });

  it('warns from 85%', () => {
    expect(counterTone(85, 100)).toBe('warn');
    expect(counterTone(99, 100)).toBe('warn');
  });

  it('goes over at and beyond 100%', () => {
    expect(counterTone(100, 100)).toBe('over');
    expect(counterTone(140, 100)).toBe('over');
  });
});
