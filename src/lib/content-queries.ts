import { getSql } from './neon';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SectionRow {
  id: string;
  label: string;
  visible: boolean;
  sort_order: number;
}

export interface ContentRow {
  field_key: string;
  field_value: string | null;
}

export interface ExperienceEntry {
  id: string;
  track: string;
  role: string;
  company: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  sort_order: number;
  visible: boolean;
  detail_body: string | null;
}

export interface ServiceTier {
  id: string;
  name: string;
  tagline: string | null;
  outcome: string | null;
  price_php: number | null;
  price_usd: number | null;
  features: string[];
  is_popular: boolean;
  sort_order: number;
  visible: boolean;
}

export interface MediaAsset {
  id: string;
  label: string;
  url: string;
  blob_pathname: string | null;
  mime_type: string | null;
  size_bytes: number | null;
}

type Row = Record<string, unknown>;

// ─── Section Visibility ───────────────────────────────────────────────────────

export async function getSectionVisibility(): Promise<Record<string, boolean>> {
  try {
    const sql = getSql();
    const rows = (await sql`SELECT id, visible FROM sections ORDER BY sort_order`) as Row[];
    return Object.fromEntries(rows.map((r) => [r.id as string, r.visible as boolean]));
  } catch {
    return {
      hero: true, about: true, experience: true, skills: true,
      projects: true, services: true, blog: true, contact: true,
    };
  }
}

// ─── Section Content ──────────────────────────────────────────────────────────

export async function getSectionContent(
  sectionId: string
): Promise<Record<string, string>> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT field_key, field_value
      FROM section_content
      WHERE section_id = ${sectionId}
    `) as Row[];
    return Object.fromEntries(
      rows.map((r) => [r.field_key as string, (r.field_value as string | null) ?? ''])
    );
  } catch {
    return {};
  }
}

// ─── Experience ───────────────────────────────────────────────────────────────

export async function getExperienceEntries(): Promise<ExperienceEntry[]> {
  try {
    const sql = getSql();
    return (await sql`
      SELECT * FROM experience_entries
      WHERE visible = true
      ORDER BY start_date DESC, sort_order ASC
    `) as unknown as ExperienceEntry[];
  } catch {
    return [];
  }
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function getServiceTiers(): Promise<ServiceTier[]> {
  try {
    const sql = getSql();
    return (await sql`
      SELECT * FROM service_tiers
      WHERE visible = true
      ORDER BY sort_order ASC
    `) as unknown as ServiceTier[];
  } catch {
    return [];
  }
}

// ─── Media ───────────────────────────────────────────────────────────────────

export async function getMediaAsset(label: string): Promise<MediaAsset | null> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM media_assets WHERE label = ${label} LIMIT 1
    `) as unknown as MediaAsset[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getAllMediaAssets(): Promise<MediaAsset[]> {
  try {
    const sql = getSql();
    return (await sql`SELECT * FROM media_assets ORDER BY created_at DESC`) as unknown as MediaAsset[];
  } catch {
    return [];
  }
}

// ─── Admin helpers ─────────────────────────────────────────────────────────

export async function getAllSections(): Promise<SectionRow[]> {
  const sql = getSql();
  return (await sql`SELECT * FROM sections ORDER BY sort_order`) as unknown as SectionRow[];
}

export async function getAllExperienceEntries(): Promise<ExperienceEntry[]> {
  const sql = getSql();
  return (await sql`
    SELECT * FROM experience_entries ORDER BY start_date DESC, sort_order ASC
  `) as unknown as ExperienceEntry[];
}

export async function getAllServiceTiers(): Promise<ServiceTier[]> {
  const sql = getSql();
  return (await sql`SELECT * FROM service_tiers ORDER BY sort_order ASC`) as unknown as ServiceTier[];
}
