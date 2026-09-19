import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Long-form documents at /research.
 *
 * These are not blog posts and deliberately do not live in the database. A
 * piece of this length is written, revised and argued over across weeks; it
 * belongs in version control where a change has a diff and an author, not in
 * a row nobody can review. That is the same reasoning as
 * src/lib/work-projects.ts, which keeps the case studies in the repo for the
 * same reason.
 *
 * The markdown is read from content/research at request time and cached by the
 * route's revalidate floor. next.config.ts declares the directory under
 * outputFileTracingIncludes, because Next's tracing cannot see through a path
 * built from a slug and would otherwise ship a build with no content in it —
 * which fails only in production, and only as an empty page.
 */

const CONTENT_DIR = path.join(process.cwd(), 'content', 'research');

export interface ResearchDocMeta {
  slug: string;
  title: string;
  subtitle?: string;
  abstract: string;
  author: string;
  /** ISO date, as written in the front matter. */
  date: string;
}

export interface ResearchDoc extends ResearchDocMeta {
  body: string;
  /** Section headings, for the contents list and for in-page anchors. */
  sections: { id: string; title: string }[];
  wordCount: number;
}

/** Splits `--- key: value --- body`. Four scalar fields do not justify a YAML parser. */
function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^\s*([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (field) meta[field[1]] = field[2].trim().replace(/^["']|["']$/g, '');
  }

  return { meta, body: match[2].trim() };
}

/**
 * Heading id, matching what react-markdown's default rendering produces, so a
 * contents link and its target agree.
 */
export function headingId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** `## ` headings, in document order. Code fences are skipped. */
function extractSections(body: string): { id: string; title: string }[] {
  const sections: { id: string; title: string }[] = [];
  let inFence = false;

  for (const line of body.split('\n')) {
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) sections.push({ id: headingId(heading[1]), title: heading[1] });
  }

  return sections;
}

export function getResearchDoc(slug: string): ResearchDoc | null {
  // The slug reaches this from a URL segment, so it is untrusted: anything
  // that is not a plain slug could otherwise walk out of the content
  // directory via the join below.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const file = path.join(CONTENT_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;

  const { meta, body } = parseFrontMatter(readFileSync(file, 'utf8'));
  if (!meta.title || !meta.abstract) return null;

  return {
    slug,
    title: meta.title,
    subtitle: meta.subtitle,
    abstract: meta.abstract,
    author: meta.author ?? 'Antonio Luis Santos',
    date: meta.date ?? '',
    body,
    sections: extractSections(body),
    wordCount: body.split(/\s+/).filter(Boolean).length,
  };
}

/** Every document, for the index and the sitemap. */
export function getResearchDocs(): ResearchDocMeta[] {
  if (!existsSync(CONTENT_DIR)) return [];

  return readdirSync(CONTENT_DIR)
    .filter(name => name.endsWith('.md'))
    .map(name => getResearchDoc(name.replace(/\.md$/, '')))
    .filter((doc): doc is ResearchDoc => doc !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ body: _body, sections: _sections, wordCount: _wordCount, ...meta }) => meta);
}
