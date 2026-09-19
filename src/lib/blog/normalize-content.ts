/**
 * Turns a stored post body into markdown.
 *
 * Two shapes exist in the table. Most rows hold plain text with blank lines
 * between paragraphs. Some older rows hold a JSON object —
 * `{introduction, body: string[], conclusion}` — because the generator was
 * once asked for structure and complied literally.
 *
 * BlogModal handled the second shape by building an HTML string and injecting
 * it with dangerouslySetInnerHTML. That was survivable in a modal nobody could
 * link to. It is not survivable on a server-rendered, cached, indexed page:
 * the content is written by a model that summarises third-party pages it was
 * pointed at, so a prompt injection reaching the body would become stored XSS
 * on the primary origin.
 *
 * So this returns markdown, and the page renders it through the existing
 * MarkdownBody (react-markdown), which escapes rather than injects. Nothing
 * here produces HTML, and guard rail N12 asserts the blog pages contain no
 * dangerouslySetInnerHTML at all.
 */

interface LegacyBody {
  introduction?: unknown;
  body?: unknown;
  conclusion?: unknown;
}

/** Cheap pre-check so ordinary prose never reaches JSON.parse. */
function looksLikeLegacyJson(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeContent(raw: string): string {
  if (typeof raw !== 'string') return '';

  const content = raw.trim();
  if (!content) return '';

  if (!looksLikeLegacyJson(content)) return content;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // A body that merely opens with a brace. Pass it through untouched rather
    // than losing it.
    return content;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return content;
  }

  const legacy = parsed as LegacyBody;
  const paragraphs: string[] = [];

  if (isNonEmptyString(legacy.introduction)) paragraphs.push(legacy.introduction.trim());

  if (Array.isArray(legacy.body)) {
    for (const item of legacy.body) {
      if (isNonEmptyString(item)) paragraphs.push(item.trim());
    }
  } else if (isNonEmptyString(legacy.body)) {
    paragraphs.push(legacy.body.trim());
  }

  if (isNonEmptyString(legacy.conclusion)) paragraphs.push(legacy.conclusion.trim());

  // A JSON object with none of the expected keys is something else entirely.
  // Returning the raw text keeps it visible and reviewable instead of
  // silently blanking the post.
  if (paragraphs.length === 0) return content;

  return paragraphs.join('\n\n');
}
