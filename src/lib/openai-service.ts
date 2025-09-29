import OpenAI from 'openai';
import { ContentGenerationRequest, ContentGenerationResponse } from '@/types/blog';

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
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

    const systemPrompt = `You are an AI content writer generating blog posts for a professional website. Follow these rules strictly:

1. Write in an analytical, explanatory, or opinionated style.
2. Do NOT write in the first person. Never say "I", "we", "our team", or imply lived experiences.
3. Avoid making up projects, companies, or personal achievements.
4. Instead, provide insights, comparisons, pros and cons, trends, or thought-provoking commentary on the topic.
5. If giving examples, keep them general, hypothetical, or based on well-known industry patterns—never fabricated case studies.
6. Tone: authoritative yet accessible, similar to an industry thought-leadership piece.
7. Each post should be evergreen and credible, not news-report style.
8. Output should always be original, non-repetitive, and focused on ideas rather than stories of personal involvement.`;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Write a detailed case study about ${topic} that analyzes industry patterns and trends. Include:
1. A hypothetical scenario or well-known industry pattern that illustrates key concepts
2. Technical challenges commonly faced in the field and proven solutions
3. Specific technologies, frameworks, and tools commonly used (mention versions)
4. Detailed technical implementation approaches based on industry best practices
5. Measurable results with realistic metrics based on industry standards
6. Contrarian insights or alternative perspectives on common approaches
7. Key technical lessons and advanced insights from industry analysis
8. References to specific industry sources, documentation, or research

Write in an analytical, authoritative tone. Focus on industry patterns, not personal experiences. Be detailed and technical while maintaining credibility.

${contextPrompt}

Format the response as JSON with: title, content, excerpt, metrics (with realistic percentage and description).`;
    } else {
      userPrompt = `Write a detailed, analytical blog post about ${topic} that provides industry insights and thought leadership. Include:
1. Contrarian perspectives on current industry trends and why popular approaches might have limitations
2. Technical best practices based on industry analysis and proven methodologies
3. Hypothetical scenarios or well-known industry patterns with technical implementation details
4. Predictions for the future with technical reasoning based on current trends
5. Advanced techniques and methodologies that are gaining traction in the industry
6. Specific tools, frameworks, and methodologies with their pros and cons
7. References to documentation, research papers, or industry sources
8. Technical deep-dives with architectural patterns and implementation strategies

Write in an authoritative, analytical tone. Focus on industry insights and technical analysis, not personal experiences. Be detailed, technical, and credible.

${contextPrompt}

Format the response as JSON with: title, content, excerpt.`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo", // Using GPT-3.5 for cost efficiency
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
    
    return {
      title: parsedResponse.title,
      content: parsedResponse.content,
      excerpt: parsedResponse.excerpt,
      metrics: parsedResponse.metrics
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