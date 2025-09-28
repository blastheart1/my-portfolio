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

const TOPICS = [
  'Generative AI',
  'Software Quality Assurance',
  'Machine Learning',
  'DevOps',
  'Cloud Computing',
  'Cybersecurity',
  'Data Science',
  'Web Development'
];

export async function generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
  try {
    const { topic, type, previousContent = [] } = request;
    
    // Create context from previous content to avoid repetition
    const contextPrompt = previousContent.length > 0 
      ? `Previous content titles: ${previousContent.map(p => p.title).join(', ')}. Avoid similar topics and approaches.`
      : '';

    const systemPrompt = `You are a technical content writer specializing in ${topic}. Create engaging, informative content that demonstrates expertise and provides value to readers.`;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Create a compelling case study about ${topic}. Include:
1. A realistic scenario with a fictional company
2. A specific challenge they faced
3. The solution implemented
4. Measurable results with a percentage improvement
5. Key takeaways

Make it professional and detailed. Include a percentage metric (like "43% improvement" or "20% increase") and a brief description of the achievement.

${contextPrompt}

Format the response as JSON with: title, content, excerpt, metrics (with percentage and description).`;
    } else {
      userPrompt = `Write an informative blog post about ${topic}. Include:
1. Current trends and developments
2. Practical insights and best practices
3. Real-world applications
4. Future outlook

Make it engaging and valuable for professionals in the field.

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
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

export function shouldGenerateCaseStudy(): boolean {
  // 40% chance of generating a case study, 60% blog post
  return Math.random() < 0.4;
}