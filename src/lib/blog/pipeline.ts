import { getProviderKey } from '@/lib/credentials-store';
import { getAssignedSlugs, insertBlogPost } from '@/lib/database';
import { callAnthropic, parseJson } from '@/lib/llm/transport';
import { generateContent } from '@/lib/openai-service';
import type { BlogPost } from '@/types/blog';

import { BlogDraftSchema, screenDraft, type BlogDraft } from './quality';
import { buildSlug, uniqueSlug } from './slug';
import { verifyAll } from './verify-links';

/**
 * The publish gate.
 *
 * Every row that reaches blog_posts comes through here. Both write paths — the
 * every-two-days cron and the admin-triggered generate route — used to call
 * insertBlogPost directly with whatever the model returned, unvalidated and
 * unread, with published set to true. That was tolerable while the posts had
 * no URLs. It stops being tolerable the moment they do.
 *
 * The shape mirrors src/lib/demo/relay/pipeline.ts, which is the pattern this
 * site already demonstrates publicly: one model writes, a model from a
 * different vendor audits, one repair pass, then stop. A model asked to check
 * its own work agrees with itself.
 *
 * One deliberate inversion from relay. Relay degrades to "unaudited" when the
 * auditor key is missing, because a visitor still learns something from an
 * unaudited demo. A publish gate has no such excuse: no auditor means reject.
 * An audit that silently stops running is worse than no audit, because the
 * pipeline still reports success. That is guard rail N11.
 */

const AUDIT_MODEL = 'claude-sonnet-4-5-20250929';

/**
 * Two attempts: the first draft, and one rewrite told exactly what was wrong.
 * Beyond that a model that keeps failing is saying the topic did not have a
 * post in it, and looping only spends money to reach the same answer.
 */
const MAX_ATTEMPTS = 2;

/** Below this the auditor is saying the post is not worth a reader's time. */
const MIN_AUDIT_SCORE = 0.6;

/** How many recent titles the duplicate check compares against. */
const DUPLICATE_WINDOW = 20;

export interface AuditVerdict {
  publishable: boolean;
  score: number;
  problems: string[];
}

export interface PublishOutcome {
  published: boolean;
  /** Present only on success. */
  id?: string;
  slug?: string;
  /** Why it was rejected, or what was changed on the way to publishing. */
  reasons: string[];
  /** Generation attempts spent. */
  attempts: number;
  /** True when an unverifiable source link turned a case study into a post. */
  downgraded: boolean;
}

export interface PipelineRequest {
  topic: string;
  type: 'blog' | 'case-study';
  previousContent?: BlogPost[];
}

/**
 * Asks a model from a different vendor whether this is worth publishing.
 *
 * The rubric is deliberately about substance rather than style. A fluent post
 * that says nothing is the characteristic failure of generated content, and it
 * is the one a spelling-and-grammar check will never catch.
 */
async function auditDraft(draft: BlogDraft): Promise<AuditVerdict | null> {
  const key = await getProviderKey('anthropic');
  // Null, not a permissive default. The caller turns this into a rejection.
  if (!key) return null;

  const system = [
    'You review a draft blog post before it is published on a working',
    'engineer’s portfolio site. Be strict. The site’s reputation is the',
    'asset; one hollow post costs more than a missing one.',
    '',
    'Reject the draft if any of these are true:',
    '- It states a statistic, date, company outcome or quotation that its',
    '  cited sources do not support, or that it invented outright.',
    '- It is fluent but empty: a reader finishes it knowing nothing they',
    '  could act on.',
    '- It restates its own introduction as its conclusion.',
    '- It is a list of generic best practices with no position taken.',
    '- It describes the author’s experience. The author did not write it.',
    '',
    'Do not reject it for being short, plain, or lacking a call to action.',
    '',
    'Reply as JSON: {"publishable": boolean, "score": number between 0 and 1,',
    '"problems": [string]} where each problem is one specific, fixable fault.',
  ].join('\n');

  const sources = (draft.sources ?? []).map(s => `- ${s.title}: ${s.url}`).join('\n');
  const user = [
    `Type: ${draft.type}`,
    `Topic: ${draft.topic}`,
    `Title: ${draft.title}`,
    `Excerpt: ${draft.excerpt}`,
    draft.caseStudyLink ? `Cited case study: ${draft.caseStudyLink}` : '',
    sources ? `Sources:\n${sources}` : '',
    '',
    draft.content,
  ]
    .filter(Boolean)
    .join('\n');

  let raw: string;
  try {
    raw = await callAnthropic(key, AUDIT_MODEL, system, user);
  } catch (error) {
    console.error('[blog] auditor call failed:', error);
    // Same rule as a missing key: an audit that did not happen is not a pass.
    return null;
  }

  const parsed = parseJson<Partial<AuditVerdict>>(raw, {});
  const score = typeof parsed.score === 'number' ? parsed.score : 0;

  return {
    // A reply we could not read scores 0 and fails, rather than defaulting to
    // publishable and letting a malformed audit wave a post through.
    publishable: parsed.publishable === true && score >= MIN_AUDIT_SCORE,
    score,
    problems: Array.isArray(parsed.problems) ? parsed.problems.filter(p => typeof p === 'string') : [],
  };
}

/**
 * Checks every URL the draft asserts.
 *
 * Returns the draft to carry forward, which may differ from the one passed in:
 * a case study whose source cannot be confirmed becomes an ordinary post with
 * the link removed, rather than a page claiming a citation nobody checked.
 */
async function verifySources(
  draft: BlogDraft
): Promise<{ draft: BlogDraft; reasons: string[]; downgraded: boolean; rejected: boolean }> {
  const urls = [
    ...(draft.caseStudyLink ? [draft.caseStudyLink] : []),
    ...(draft.sources ?? []).map(source => source.url),
  ];

  if (urls.length === 0) return { draft, reasons: [], downgraded: false, rejected: false };

  const verdicts = await verifyAll(urls);

  // A source that does not resolve is the clearest evidence of a fabricated
  // citation there is, and it is not something a rewrite can be trusted to fix.
  const dead = urls.filter(url => verdicts.get(url) === 'dead');
  if (dead.length > 0) {
    return {
      draft,
      reasons: dead.map(url => `cites a source that does not resolve: ${url}`),
      downgraded: false,
      rejected: true,
    };
  }

  if (draft.caseStudyLink && verdicts.get(draft.caseStudyLink) === 'unverified') {
    // Publishers behind a CDN routinely refuse our request, so this is common
    // and is not evidence of anything. We simply cannot claim the citation, so
    // the post keeps its substance and drops the claim.
    return {
      draft: { ...draft, type: 'blog', caseStudyLink: null },
      reasons: [`could not confirm the cited source, published as a blog post instead: ${draft.caseStudyLink}`],
      downgraded: true,
      rejected: false,
    };
  }

  return { draft, reasons: [], downgraded: false, rejected: false };
}

/**
 * Generates, screens, audits, and publishes at most one post.
 *
 * Never throws for content reasons. A rejection is a normal outcome reported
 * in the return value, because the caller is a cron whose only other signal is
 * an HTTP status nobody reads.
 */
export async function runContentPipeline(request: PipelineRequest): Promise<PublishOutcome> {
  const previousContent = request.previousContent ?? [];
  const recentTitles = previousContent.slice(0, DUPLICATE_WINDOW).map(post => post.title);

  let reasons: string[] = [];
  let downgraded = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Only a repair pass carries notes; the first attempt has nothing to fix.
    const revisionNotes = attempt === 1 ? [] : reasons;
    reasons = [];

    let generated;
    try {
      generated = await generateContent({
        topic: request.topic,
        type: request.type,
        previousContent,
        revisionNotes,
      });
    } catch (error) {
      // A provider outage is not a content failure and a rewrite will not fix
      // it, so stop rather than spending the second attempt on it.
      return {
        published: false,
        reasons: [`generation failed: ${error instanceof Error ? error.message : String(error)}`],
        attempts: attempt,
        downgraded: false,
      };
    }

    const candidate = {
      ...generated,
      type: request.type,
      topic: request.topic,
    };

    // Schema first: the checks below assume a well-formed draft, and a
    // truncated reply should be reported as such rather than as ten
    // downstream symptoms.
    const parsed = BlogDraftSchema.safeParse(candidate);
    if (!parsed.success) {
      reasons = parsed.error.issues.map(
        issue => `schema: ${issue.path.join('.') || '(root)'} ${issue.message.toLowerCase()}`
      );
      continue;
    }

    const verified = await verifySources(parsed.data);
    if (verified.rejected) {
      reasons = verified.reasons;
      continue;
    }
    downgraded = verified.downgraded;

    // Screened after verification so the case-study rule sees the final type.
    const screen = screenDraft(verified.draft, recentTitles);
    if (!screen.pass) {
      reasons = screen.reasons;
      continue;
    }

    const verdict = await auditDraft(verified.draft);
    if (!verdict) {
      // N11. No auditor, no publication — and no second attempt, because the
      // auditor will still be missing.
      return {
        published: false,
        reasons: [
          'no auditor available: an Anthropic key is required to publish, ' +
            'because an unaudited post is exactly what this gate exists to stop',
        ],
        attempts: attempt,
        downgraded,
      };
    }

    if (!verdict.publishable) {
      reasons = verdict.problems.length > 0
        ? verdict.problems
        : [`the auditor scored this ${verdict.score.toFixed(2)}, below ${MIN_AUDIT_SCORE}`];
      continue;
    }

    return publish(verified.draft, attempt, verified.reasons, downgraded);
  }

  return {
    published: false,
    reasons: [`rejected after ${MAX_ATTEMPTS} attempts`, ...reasons],
    attempts: MAX_ATTEMPTS,
    downgraded,
  };
}

/** Assigns the permanent slug and writes the row. */
async function publish(
  draft: BlogDraft,
  attempts: number,
  notes: string[],
  downgraded: boolean
): Promise<PublishOutcome> {
  try {
    const taken = await getAssignedSlugs();
    // The id is not known until after the insert, so the fallback for an
    // untitleable draft uses the title's own text as its seed. In practice a
    // draft that reached this point has a title, because the schema requires
    // twenty characters of one.
    const slug = uniqueSlug(buildSlug(draft.title, draft.title), taken);

    const row = await insertBlogPost({
      title: draft.title,
      content: draft.content,
      excerpt: draft.excerpt,
      type: draft.type,
      topic: draft.topic,
      metrics: draft.metrics,
      sources: draft.sources,
      caseStudyLink: draft.caseStudyLink ?? undefined,
      published: true,
      slug,
    });

    return {
      published: true,
      id: (row as { id?: string })?.id,
      slug,
      reasons: notes,
      attempts,
      downgraded,
    };
  } catch (error) {
    // A unique-index violation lands here, which is the correct outcome: a
    // failed insert is recoverable, a duplicated URL is not.
    return {
      published: false,
      reasons: [`insert failed: ${error instanceof Error ? error.message : String(error)}`],
      attempts,
      downgraded,
    };
  }
}
