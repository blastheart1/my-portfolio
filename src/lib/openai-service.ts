import OpenAI from 'openai';
import { ContentGenerationRequest, ContentGenerationResponse } from '@/types/blog';

let openai: OpenAI | null = null;

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


// Topic weights for weighted random selection - higher priority for AI, Software QA, and Software Development
const TOPIC_WEIGHTS = [
  // High Priority topics (60% total)
  { topic: 'Generative AI', weight: 15 },
  { topic: 'Software Quality Assurance', weight: 15 },
  { topic: 'Machine Learning', weight: 10 },
  { topic: 'Software Development Best Practices', weight: 10 },
  { topic: 'AI in Software Development', weight: 10 },
  
  // Medium Priority topics (25% total)
  { topic: 'Test-Driven Development', weight: 8 },
  { topic: 'Code Quality and Review', weight: 7 },
  { topic: 'Software Architecture', weight: 5 },
  { topic: 'DevOps', weight: 5 },
  { topic: 'Web Development', weight: 5 },
  { topic: 'API Development', weight: 5 },
  { topic: 'Microservices', weight: 5 },
  
  // Lower Priority topics (15% total)
  { topic: 'Cloud Computing', weight: 3 },
  { topic: 'Data Science', weight: 3 },
  { topic: 'Cybersecurity', weight: 2 }
];

export async function generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
  try {
    const { topic, type, previousContent = [] } = request;
    
    // Create context from previous content to avoid repetition
    const contextPrompt = previousContent.length > 0 
      ? `Previous content titles: ${previousContent.map(p => p.title).join(', ')}. Avoid similar topics and approaches.`
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

- If you cannot fetch a credible source link due to system limitations:  
  → Output a general blog post on the same topic instead.  
  → At the end of the post, add:  
    "🔎 No relevant case study available from trusted sources. This article provides a general analysis instead."  

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

- If you cannot find a credible source link due to system limitations:
  → Output a general blog post on the same topic instead
  → At the end of the post, add: "🔎 No relevant case study available from trusted sources. This article provides a general analysis instead."

${contextPrompt}

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

Format the response as JSON with: title, content (as plain text, not JSON), excerpt.`;
    }

    // Use GPT-3.5-turbo for both blog posts and case studies (cost-effective)
    const client = getOpenAI();
    const model = "gpt-3.5-turbo";
    
    const completion = await client.chat.completions.create({
      model: model,
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

    // Parse JSON response
    const parsedResponse = JSON.parse(response);

    // Handle caseStudyLink. The model may report "no credible source" as a
    // missing value or the literal string "null"; both mean the UI should show
    // the disclaimer instead of a link. Blog posts never carry one.
    const rawLink = parsedResponse.caseStudyLink;
    const caseStudyLink =
      type === 'case-study' && rawLink && rawLink !== 'null' ? rawLink : null;
    
    return {
      title: parsedResponse.title,
      content: parsedResponse.content,
      excerpt: parsedResponse.excerpt,
      metrics: parsedResponse.metrics,
      sources: parsedResponse.sources,
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