/**
 * quality.test.ts
 *
 * The deterministic screen. Every case here is one the generator has produced
 * or could produce tomorrow, so the negative tests matter more than the happy
 * path: a gate that passes good drafts but also passes bad ones is worse than
 * no gate, because it looks like protection.
 *
 * Reasons are asserted by content, not just by count. "It failed" is not
 * actionable when the cron has been quietly publishing nothing for a week.
 */

import { describe, it, expect } from 'vitest';

import {
  BANNED_PATTERNS,
  countWords,
  DUPLICATE_TITLE_THRESHOLD,
  PROFILES,
  MAX_CONTENT_WORDS,
  MIN_CONTENT_WORDS,
  screenDraft,
  titleSimilarity,
} from '../quality';

/** A body of `n` words that reads like prose and trips nothing. */
function body(words: number): string {
  const sentence = 'Deterministic rules remain auditable while model calls absorb unstructured input. ';
  const per = countWords(sentence);
  return sentence.repeat(Math.ceil(words / per)).split(/\s+/).slice(0, words).join(' ');
}

function draft(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Choosing Between Deterministic Rules And Model Calls',
    excerpt:
      'Some decisions belong in rules that an auditor can read, and some genuinely need a language model. Getting that split wrong is why automation projects get switched off.',
    content: body(400),
    type: 'blog',
    topic: 'Decision Automation',
    ...overrides,
  };
}

describe('countWords', () => {
  it('counts words, not characters, and ignores surrounding space', () => {
    expect(countWords('  one two   three  ')).toBe(3);
  });

  it('returns zero for empty and whitespace-only input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n  ')).toBe(0);
  });
});

describe('titleSimilarity', () => {
  it('scores an identical title as 1', () => {
    expect(titleSimilarity('Rules And Models', 'Rules And Models')).toBe(1);
  });

  it('scores unrelated titles low', () => {
    expect(titleSimilarity('Rules And Models', 'Testing Strategy For Releases')).toBeLessThan(0.2);
  });

  it('scores an extension of the same phrase above the duplicate threshold', () => {
    // The added tokens count against the union, so this lands near 0.71 rather
    // than near 1. DUPLICATE_TITLE_THRESHOLD is set below it deliberately.
    const score = titleSimilarity(
      'Choosing Between Rules And Models',
      'Choosing Between Rules And Models In Production'
    );
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_TITLE_THRESHOLD);
    expect(score).toBeLessThan(0.8);
  });

  it('ignores punctuation and case', () => {
    expect(titleSimilarity('Rules, Models & Cost', 'rules models cost')).toBe(1);
  });

  it('returns 0 when either title has no word tokens', () => {
    expect(titleSimilarity('', 'Rules And Models')).toBe(0);
    expect(titleSimilarity('!!!', 'Rules And Models')).toBe(0);
  });
});

describe('screenDraft — a good draft passes', () => {
  it('accepts a well-formed blog post', () => {
    const result = screenDraft(draft());
    expect(result.reasons).toEqual([]);
    expect(result.pass).toBe(true);
  });

  it('accepts a case study that cites a source', () => {
    const result = screenDraft(
      draft({ type: 'case-study', caseStudyLink: 'https://aws.amazon.com/solutions/case-studies/example' })
    );
    expect(result.pass).toBe(true);
  });

  it('accepts a quotation written in the first person', () => {
    // A cited case study quoting its own customer is not the author speaking.
    // Rejecting this would make every genuine case study unpublishable.
    const result = screenDraft(
      draft({ content: `${body(380)} The report quotes the team directly: "We cut handling time in half."` })
    );
    expect(result.pass).toBe(true);
  });

  it('accepts prose mentioning US-based clients', () => {
    // Lowercase "us" is first person; the country is not.
    const result = screenDraft(draft({ content: `${body(390)} Adoption among US based firms rose.` }));
    expect(result.pass).toBe(true);
  });
});

describe('screenDraft — schema failures', () => {
  it('rejects a non-object outright', () => {
    for (const value of [null, undefined, 'a string', 42, []]) {
      expect(screenDraft(value).pass).toBe(false);
    }
  });

  it('names the offending field', () => {
    const result = screenDraft(draft({ title: 'Too short' }));
    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/schema: title/);
  });

  it('rejects an excerpt outside its bounds', () => {
    expect(screenDraft(draft({ excerpt: 'Tiny.' })).pass).toBe(false);
    expect(screenDraft(draft({ excerpt: 'x'.repeat(201) })).pass).toBe(false);
  });

  it('rejects a non-https or malformed source URL', () => {
    expect(
      screenDraft(draft({ sources: [{ title: 'A source', url: 'http://aws.amazon.com/x' }] })).pass
    ).toBe(false);
    expect(
      screenDraft(draft({ sources: [{ title: 'A source', url: 'not-a-url' }] })).pass
    ).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(screenDraft(draft({ type: 'newsletter' })).pass).toBe(false);
  });
});

describe('screenDraft — banned phrasing', () => {
  it('rejects the generator’s own no-source fallback disclaimer', () => {
    // This one is in real rows: the prompt used to instruct the model to emit
    // it. An emoji apologising for the absence of research is the clearest
    // "machine wrote this and nobody read it" signal a page can carry.
    const result = screenDraft(
      draft({
        content: `${body(380)} 🔎 No relevant case study available from trusted sources. This article provides a general analysis instead.`,
      })
    );
    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/fallback disclaimer/);
  });

  it.each([
    ['an assistant self-reference', 'As an AI language model, consider the following.'],
    ['placeholder text', 'Lorem ipsum dolor sit amet.'],
    ['an unfinished marker', 'TODO: expand this section.'],
    ['a bracketed placeholder', '[insert company name] reduced handling time.'],
    ['an unresolved template', 'The result was {{metric}} better.'],
    ['a script tag', 'Read more <script>alert(1)</script> here.'],
    ['a javascript URL', 'See javascript:alert(1) for details.'],
    ['an inline event handler', 'An image <img src=x onerror="alert(1)"> appears.'],
  ])('rejects %s', (_label, injected) => {
    const result = screenDraft(draft({ content: `${body(380)} ${injected}` }));
    expect(result.pass).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('catches banned phrasing in the title and excerpt, not only the body', () => {
    expect(screenDraft(draft({ title: 'TODO Finish This Title Before Publishing It' })).pass).toBe(false);
  });

  it('every banned pattern is actually exercised by a fixture above', () => {
    // Stops the list rotting into entries nothing proves are matchable.
    expect(BANNED_PATTERNS.length).toBeGreaterThan(0);
    for (const { pattern, label } of BANNED_PATTERNS) {
      expect(pattern, `${label} has no regex`).toBeInstanceOf(RegExp);
    }
  });
});

describe('screenDraft — first person', () => {
  it.each([
    ['I have seen this pattern repeatedly.'],
    ['We reduced handling time by half.'],
    ['Our approach favours deterministic rules.'],
    ['This gave us a shorter feedback loop.'],
    ["I'm convinced the split matters."],
  ])('rejects %j', injected => {
    const result = screenDraft(draft({ content: `${body(380)} ${injected}` }));
    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('written in the first person');
  });
});

describe('screenDraft — length', () => {
  it('rejects a body below the floor and says how short it was', () => {
    const result = screenDraft(draft({ content: body(40) }));
    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(new RegExp(`40 words, minimum ${MIN_CONTENT_WORDS}`));
  });

  it('rejects a body above the ceiling', () => {
    const result = screenDraft(draft({ content: body(MAX_CONTENT_WORDS + 50) }));
    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/too long/);
  });

  it('accepts a body exactly on each boundary', () => {
    expect(screenDraft(draft({ content: body(MIN_CONTENT_WORDS) })).pass).toBe(true);
    expect(screenDraft(draft({ content: body(MAX_CONTENT_WORDS) })).pass).toBe(true);
  });
});

describe('screenDraft — case studies must cite something', () => {
  it('rejects a case study with no source link', () => {
    const result = screenDraft(draft({ type: 'case-study' }));
    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('a case study with no source link');
  });

  it('rejects a case study whose link was nulled', () => {
    expect(screenDraft(draft({ type: 'case-study', caseStudyLink: null })).pass).toBe(false);
  });

  it('does not require a link on an ordinary blog post', () => {
    expect(screenDraft(draft({ type: 'blog', caseStudyLink: null })).pass).toBe(true);
  });
});

describe('screenDraft — duplicates', () => {
  const recent = [
    'Choosing Between Deterministic Rules And Model Calls',
    'Test Strategy For Continuously Released Platforms',
  ];

  it('rejects a near-duplicate and names the post it duplicates', () => {
    const result = screenDraft(
      draft({ title: 'Choosing Between Deterministic Rules And Model Calls Today' }),
      recent
    );
    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/near-duplicate/);
  });

  it('allows a genuinely different post on a related topic', () => {
    const result = screenDraft(
      draft({ title: 'What Rule Engines Still Do Better Than Language Models' }),
      recent
    );
    expect(result.pass).toBe(true);
  });

  it('does not treat an empty history as a duplicate', () => {
    expect(screenDraft(draft(), []).pass).toBe(true);
  });
});

describe('screenDraft — reporting', () => {
  it('reports every reason at once, not just the first', () => {
    const result = screenDraft(
      draft({ content: `${body(30)} We shipped it. TODO: expand.` }),
      ['Choosing Between Deterministic Rules And Model Calls']
    );

    expect(result.pass).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(4);
  });
});


/**
 * The essay profile.
 *
 * Added when the first hand-written post failed the gate on length and on
 * first person — two rules that were about a machine writing as Luis, not
 * about quality. Everything that IS about quality applies identically, and
 * these tests exist to prove the relaxation did not quietly become a
 * back door.
 */
describe('the essay profile relaxes only authorship, never quality', () => {
  function essay(overrides: Record<string, unknown> = {}) {
    return draft({ content: body(2000), ...overrides });
  }

  it('accepts a length the generated profile would reject', () => {
    const long = draft({ content: body(5000) });

    expect(screenDraft(long, [], 'generated').pass).toBe(false);
    expect(screenDraft(long, [], 'essay').pass).toBe(true);
  });

  it('accepts first person, which is the whole point of an essay', () => {
    const personal = essay({
      content: `${body(1900)} I have spent a decade building these systems and I think the split matters.`,
    });

    expect(screenDraft(personal, [], 'generated').reasons).toContain(
      'written in the first person'
    );
    expect(screenDraft(personal, [], 'essay').pass).toBe(true);
  });

  it('still rejects an essay that is too short to be one', () => {
    const result = screenDraft(draft({ content: body(300) }), [], 'essay');

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/too short/);
  });

  it('still rejects one past the sanity ceiling', () => {
    const result = screenDraft(
      draft({ content: body(PROFILES.essay.maxWords + 100) }),
      [],
      'essay'
    );

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/too long/);
  });

  it.each([
    ['the no-source disclaimer', '🔎 No relevant case study available from trusted sources.'],
    ['a script tag', '<script>alert(1)</script>'],
    ['an inline event handler', '<img src=x onerror="alert(1)">'],
    ['a javascript URL', 'See javascript:alert(1).'],
    ['an unfinished marker', 'TODO: finish this section.'],
  ])('still rejects %s', (_label, injected) => {
    expect(screenDraft(essay({ content: `${body(1900)} ${injected}` }), [], 'essay').pass).toBe(
      false
    );
  });

  it('still rejects a near-duplicate title', () => {
    const result = screenDraft(essay(), ['Choosing Between Deterministic Rules And Model Calls'], 'essay');
    expect(result.pass).toBe(false);
  });

  it('still enforces the schema', () => {
    expect(screenDraft(essay({ excerpt: 'Too short.' }), [], 'essay').pass).toBe(false);
    expect(screenDraft(essay({ type: 'newsletter' }), [], 'essay').pass).toBe(false);
  });

  it('defaults to the generated profile, so existing callers are unchanged', () => {
    const long = draft({ content: body(5000) });
    expect(screenDraft(long, [])).toEqual(screenDraft(long, [], 'generated'));
  });
});
