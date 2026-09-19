import OpenAI from 'openai';
import { ContentGenerationRequest, ContentGenerationResponse } from '@/types/blog';
import { parseJson } from '@/lib/llm/transport';

let openai: OpenAI | null = null;

/**
 * The drafting model.
 *
 * Was gpt-3.5-turbo, chosen for cost when this was a decorative carousel
 * nobody could link to. These posts are about to have indexable URLs, and the
 * difference between the two models is visible in a paragraph of prose.
 *
 * Exported so a guard rail can assert what it is NOT. Which model is best is
 * a judgement that will keep changing; that it is not the deprecated one is a
 * fact a test can hold.
 */
export const BLOG_MODEL = 'gpt-4o-mini';

function getOpenAI() {
  if (!openai) {
    // Server-only. Must NOT be a NEXT_PUBLIC_* var — those are inlined into
    // the client bundle and would publish the key.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // This used to return a mock client emitting {"title": "Mock Title"}.
      // Both callers (POST /api/blog/generate and the every-2-days cron) write
      // straight to the blog table, so an unset key silently published
      // placeholder posts to the live site. Fail loudly instead.
      throw new Error(
        'OPENAI_API_KEY is not set — refusing to generate blog content. ' +
          'Set it in the environment before calling /api/blog/generate or the ' +
          'content cron.'
      );
    }
    openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openai;
}


/**
 * Topics, weighted.
 *
 * Narrowed from a generic technology list. "Cloud Computing", "Microservices"
 * and "Data Science" produced posts that could have appeared on any blog on
 * the internet, which builds topical authority for nobody and actively dilutes
 * the entity signal the JSON-LD on this site works to establish. Every topic
 * here is something the site claims expertise in and someone might plausibly
 * be hiring for.
 */
const TOPIC_WEIGHTS = [
  // The differentiator: generative AI on top of auditable decisioning.
  { topic: 'LLM Integration in Production Systems', weight: 14 },
  { topic: 'Agentic AI Systems and Tool Use', weight: 12 },
  { topic: 'Choosing Between Deterministic Rules and Language Models', weight: 12 },
  { topic: 'Business Rule Management and Decision Automation', weight: 10 },
  { topic: 'Retrieval-Augmented Generation', weight: 8 },

  // The delivery work that pays for it.
  { topic: 'Workflow Automation Between Disconnected Systems', weight: 10 },
  { topic: 'API and Platform Integration', weight: 8 },
  { topic: 'Legacy System Integration and Migration Risk', weight: 6 },

  // The QA background, which is the reason to trust any of the above.
  { topic: 'Quality Assurance for AI-Backed Features', weight: 8 },
  { topic: 'Test Strategy and Release Reliability', weight: 6 },

  // Practical selection criteria people actually search for.
  { topic: 'Model Selection, Cost per Token and Latency', weight: 6 },
];

export async function generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
  try {
    const { topic, type, previousContent = [], revisionNotes = [] } = request;
    
    // Create context from previous content to avoid repetition
    const contextPrompt = previousContent.length > 0 
      ? `Previous content titles: ${previousContent.map(p => p.title).join(', ')}. Avoid similar topics and approaches.`
      : '';

    // The repair pass. The publish gate hands back the specific reasons a
    // draft failed, and a rewrite that is not told why tends to fail the same
    // way twice.
    const revisionPrompt = revisionNotes.length > 0
      ? [
          '',
          'A previous attempt at this post was rejected for these reasons:',
          ...revisionNotes.map(note => `- ${note}`),
          '',
          'Write it again and fix every one of them. Say less rather than',
          'padding to reach a length.',
        ].join('\n')
      : '';

    const systemPrompt = `You are an AI content writer generating posts for a professional blog. 
The blog has two content types: General Blog Posts and Case Study Spotlights. 
Follow the rules carefully.

=== INTEGRITY RULES ===
1. Never write in the first person (no "I", "we", "our team").  
2. Never fabricate projects, companies, or achievements.  
3. Do not invent case studies.  
4. If a case study is required, only summarize from credible sources (AWS, Google Cloud, Microsoft, IBM, McKinsey, Deloitte, Gartner, Forrester).  
5. Always include the original source link at the end of the case study if available.  
6. Tone: professional, analytical, and accessible.  

=== CONTENT TYPE 1: GENERAL BLOG POST ===
- Purpose: Share insights, trends, or commentary on a topic.  
- Structure: Title → Intro → 2–3 insights → Conclusion.  
- Keep concise, blog-friendly.  

=== CONTENT TYPE 2: CASE STUDY SPOTLIGHT BLOG POST ===
- Purpose: Summarize a real-world case study.  
- Structure: Title → Intro (context) → Challenge → Approach → Takeaway → Source link.  
- Length: 3–5 short paragraphs max.  

=== SOURCE HANDLING ===
- If you have browsing or web access, fetch case studies only from these sites:  
  • AWS: https://aws.amazon.com/solutions/case-studies/  
  • Google Cloud: https://cloud.google.com/customers  
  • Microsoft Azure: https://customers.microsoft.com/en-us/  
  • IBM: https://www.ibm.com/case-studies  
  • McKinsey: https://www.mckinsey.com/featured-insights  
  • Deloitte: https://www2.deloitte.com/insights/us/en.html  
  • Gartner: https://www.gartner.com/en/insights  
  • Forrester: https://www.forrester.com/research  

- If you cannot cite a credible source from that list, write a general blog
  post on the same topic instead and set caseStudyLink to null. Do NOT add a
  note explaining that no case study was available: the reader is owed a good
  post, not an apology for the one you did not write.

=== TASK ===
When given a topic:  
- If a real case study link from trusted sources is possible, generate a Case Study Spotlight.  
- If not, default to a General Blog Post with the fallback note.  `;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Create a Case Study Spotlight Blog Post about ${topic}.

Follow these guidelines:
- If you can find a real case study from these approved sources, create a Case Study Spotlight:
  • AWS: https://aws.amazon.com/solutions/case-studies/
  • Google Cloud: https://cloud.google.com/customers
  • Microsoft Azure: https://customers.microsoft.com/en-us/
  • IBM: https://www.ibm.com/case-studies
  • McKinsey: https://www.mckinsey.com/featured-insights
  • Deloitte: https://www2.deloitte.com/insights/us/en.html
  • Gartner: https://www.gartner.com/en/insights
  • Forrester: https://www.forrester.com/research

- Structure: Title → Intro (context) → Challenge → Approach → Takeaway → Source link
- Length: 3–5 short paragraphs max
- Always include the original source link at the end if available

- If you cannot cite a credible source from that list, write a general blog
  post on the same topic instead and set caseStudyLink to null. Do not add a
  note explaining the absence.

${contextPrompt}
${revisionPrompt}

Format the response as JSON with: title, content (as plain text, not JSON), excerpt, caseStudyLink (the actual source URL if available, or null if not).`;
    } else {
      userPrompt = `Generate a General Blog Post about ${topic} that shares insights, trends, or commentary.

Structure:
- Title: Catchy and professional
- Introduction: 2–3 sentences setting context
- Body: 2–3 short sections analyzing trends, comparisons, or pros/cons
- Conclusion: 2–3 sentences with a key takeaway

Write in a professional, analytical tone. Focus on industry insights and trends, not personal experiences.

${contextPrompt}
${revisionPrompt}

Format the response as JSON with: title, content (as plain text, not JSON), excerpt.`;
    }

    const client = getOpenAI();

    const completion = await client.chat.completions.create({
      model: BLOG_MODEL,
      // Without this the model is merely asked nicely for JSON, and the
      // JSON.parse below used to throw whenever it answered with prose or a
      // fenced block instead. That threw inside a cron, where nothing was
      // watching.
      response_format: { type: 'json_object' },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: type === 'case-study' ? 1500 : 1200, // Case studies need more tokens
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // parseJson rather than JSON.parse: a malformed reply must reach the
    // publish gate as a draft that fails validation, not as an exception.
    const parsedResponse = parseJson<Record<string, unknown>>(response, {});

    // Handle caseStudyLink. The model may report "no credible source" as a
    // missing value or the literal string "null"; both mean there is nothing
    // to cite. Blog posts never carry one.
    const rawLink = parsedResponse.caseStudyLink;
    const caseStudyLink =
      type === 'case-study' && rawLink && rawLink !== 'null' ? (rawLink as string) : null;
    
    return {
      title: parsedResponse.title as string,
      content: parsedResponse.content as string,
      excerpt: parsedResponse.excerpt as string,
      metrics: parsedResponse.metrics as ContentGenerationResponse['metrics'],
      sources: parsedResponse.sources as ContentGenerationResponse['sources'],
      caseStudyLink: caseStudyLink
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

export function getRandomTopic(): string {
  // Calculate total weight
  const totalWeight = TOPIC_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  
  // Generate random number between 0 and totalWeight
  let random = Math.random() * totalWeight;
  
  // Find the topic based on weighted selection
  for (const item of TOPIC_WEIGHTS) {
    random -= item.weight;
    if (random <= 0) {
      return item.topic;
    }
  }
  
  // Fallback to first topic if something goes wrong
  return TOPIC_WEIGHTS[0].topic;
}

export function shouldGenerateCaseStudy(): boolean {
  // 40% chance of generating a case study, 60% blog post
  return Math.random() < 0.4;
}