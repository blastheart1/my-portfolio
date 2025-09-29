import OpenAI from 'openai';
import { ContentGenerationRequest, ContentGenerationResponse } from '@/types/blog';

let openai: OpenAI | null = null;
let perplexity: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });
  }
  return openai;
}

function getPerplexity() {
  if (!perplexity) {
    if (!process.env.PERPLEXITY_API_KEY) {
      console.warn('PERPLEXITY_API_KEY not found, falling back to OpenAI GPT-4');
      return getOpenAI();
    }
    perplexity = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });
  }
  return perplexity;
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
This blog has two content types: General Blog Posts and Case Study Spotlights. 
Follow the rules below carefully.

=== INTEGRITY RULES ===
1. Never write in the first person (no "I", "we", "our team").  
2. Never fabricate projects, companies, or achievements.  
3. Do not invent case studies. If a case study is required, summarize only from credible sources listed below.  
4. Tone: professional, analytical, and accessible (thought leadership style).  
5. Keep outputs concise, clear, and blog-friendly.  

=== CONTENT TYPE 1: GENERAL BLOG POST ===
- Purpose: Share insights, trends, or commentary on a topic.  
- Structure:  
   - Title: Catchy and professional.  
   - Introduction: 2–3 sentences setting context.  
   - Body: 2–3 short sections analyzing trends, comparisons, or pros/cons.  
   - Conclusion: 2–3 sentences with a key takeaway.  

Example:  
❌ Wrong: "I migrated a Fortune 500 company to the cloud."  
✅ Correct: "Enterprises migrating to the cloud often face a trade-off between serverless simplicity and Kubernetes flexibility."  

=== CONTENT TYPE 2: CASE STUDY SPOTLIGHT BLOG POST ===
- Purpose: Summarize a real-world case study in short blog format.  
- Structure:  
   - Title: Clear, problem–solution focused.  
   - Introduction: Context of the industry problem (1 paragraph).  
   - Challenge: Main issue (1 short paragraph).  
   - Approach: How the case study subject addressed the issue (1 short paragraph).  
   - Takeaway: Insight or lesson learned (1–2 sentences).  
   - Source link: Always provide the actual case study link.  
- Length: 3–5 short paragraphs max.  

=== APPROVED CASE STUDY SOURCES ===
When generating Case Study Spotlights, only use case studies, reports, or success stories from:  
- AWS Case Studies: https://aws.amazon.com/solutions/case-studies/  
- Google Cloud Customer Stories: https://cloud.google.com/customers  
- Microsoft Azure Case Studies: https://customers.microsoft.com/en-us/  
- IBM Case Studies: https://www.ibm.com/case-studies  
- McKinsey Insights & Case Studies: https://www.mckinsey.com/featured-insights  
- Deloitte Insights: https://www2.deloitte.com/insights/us/en.html  
- Gartner Insights: https://www.gartner.com/en/insights  
- Forrester Case Studies: https://www.forrester.com/research  

Rules for Case Studies:  
1. Never invent a case study or result.  
2. Always cite the actual source link at the end.  
3. If no relevant case study exists, output:  
   "No relevant case study available in the trusted sources list."  

=== TASK ===
When given a topic, generate either:  
- A General Blog Post (if no case study reference is provided), OR  
- A Case Study Spotlight Blog Post (if a case study is referenced or explicitly requested).`;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Create a Case Study Analysis Blog Post about ${topic} using your knowledge of real industry case studies.

Focus on well-known, documented case studies from these types of sources:
- AWS Case Studies (e.g., Netflix, Airbnb, Spotify migrations)
- Google Cloud Customer Stories (e.g., Twitter, Snapchat, PayPal)
- Microsoft Azure Case Studies (e.g., BMW, GE, Starbucks)
- IBM Case Studies (e.g., Walmart, American Airlines)
- McKinsey Insights (e.g., digital transformation studies)
- Deloitte Insights (e.g., enterprise modernization)
- Gartner Research (e.g., technology adoption studies)
- Forrester Case Studies (e.g., customer experience transformations)

Create a blog post with:
- Title: Clear, problem–solution focused
- Introduction: Context of the industry problem (1 paragraph)
- Challenge: Main issue faced in the industry (1 short paragraph)  
- Approach: How the case study subject addressed the issue (1 short paragraph)
- Takeaway: Key insights and lessons learned (1–2 sentences)
- Source: A relevant URL from the approved sources

Use your knowledge of real, documented case studies. Reference actual companies and their documented challenges/solutions.

${contextPrompt}

CRITICAL: Your response MUST be valid JSON with these exact fields:
{
  "title": "Your title here",
  "content": "Your content here", 
  "excerpt": "Your excerpt here",
  "caseStudyLink": "https://aws.amazon.com/solutions/case-studies/netflix/"
}

The caseStudyLink field is REQUIRED and must contain a real URL from the approved sources.

Example response:
{
  "title": "Netflix's Cloud Migration Success Story",
  "content": "Netflix successfully migrated to AWS...",
  "excerpt": "How Netflix transformed their infrastructure...",
  "caseStudyLink": "https://aws.amazon.com/solutions/case-studies/netflix/"
}`;
    } else {
      userPrompt = `Generate a General Blog Post about ${topic} that shares insights, trends, or commentary.

Structure:
- Title: Catchy and professional
- Introduction: 2–3 sentences setting context
- Body: 2–3 short sections analyzing trends, comparisons, or pros/cons
- Conclusion: 2–3 sentences with a key takeaway

Write in a professional, analytical tone. Focus on industry insights and trends, not personal experiences.

${contextPrompt}

Format the response as JSON with: title, content, excerpt.`;
    }

    // Use GPT-4 for case studies (better reasoning and knowledge), GPT-3.5 for blog posts
    const client = getOpenAI();
    const model = type === 'case-study' ? "gpt-4" : "gpt-3.5-turbo";
    
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
    
    // Debug logging
    console.log('Generated response keys:', Object.keys(parsedResponse));
    console.log('caseStudyLink value:', parsedResponse.caseStudyLink);
    console.log('Full response:', JSON.stringify(parsedResponse, null, 2));
    
    // Ensure caseStudyLink is always provided for case studies
    let caseStudyLink = parsedResponse.caseStudyLink;
    if (type === 'case-study') {
      if (!caseStudyLink) {
        // Fallback to a general industry source
        caseStudyLink = 'https://aws.amazon.com/solutions/case-studies/';
        console.log('Using fallback caseStudyLink:', caseStudyLink);
      } else {
        console.log('AI generated caseStudyLink:', caseStudyLink);
      }
    } else {
      // For blog posts, no case study link needed
      caseStudyLink = undefined;
    }
    
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