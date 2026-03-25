import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');
const MAX_CHARS = 8000;
const CACHE_TTL_MS = 60_000; // re-read at most once per minute

let cachedContext = '';
let cacheTimestamp = 0;

/**
 * Reads all .md files from the /knowledge directory and concatenates them
 * into a single string suitable for injection as an AI system prompt.
 * Server-side only — never import this from client components.
 */
export function loadKnowledgeContext(): string {
  const now = Date.now();
  const isDev = process.env.NODE_ENV === 'development';

  // In production cache for 60s; in dev always re-read for instant feedback
  if (!isDev && cachedContext && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedContext;
  }

  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return '';
    }

    const files = fs
      .readdirSync(KNOWLEDGE_DIR)
      .filter(f => f.endsWith('.md'))
      .sort(); // alphabetical for deterministic order

    if (files.length === 0) return '';

    const sections = files.map(file => {
      const name = file.replace(/\.md$/, '');
      const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf-8').trim();
      return `## ${name}\n\n${content}`;
    });

    let combined = sections.join('\n\n---\n\n');

    if (combined.length > MAX_CHARS) {
      combined =
        combined.slice(0, MAX_CHARS) +
        '\n\n[Knowledge truncated for token budget]';
    }

    cachedContext = combined;
    cacheTimestamp = now;
    return combined;
  } catch (err) {
    console.warn('[knowledgeLoader] Failed to load knowledge files:', err);
    return '';
  }
}
