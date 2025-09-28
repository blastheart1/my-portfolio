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

    const systemPrompt = `You are a technical content writer specializing in ${topic}. Create fact-based, educational content that provides real value to readers. Focus on current industry trends, established best practices, and verifiable information. Avoid fictional scenarios and focus on real-world applications and proven methodologies.`;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Create a fact-based case study about ${topic}. Include:
1. A real-world scenario based on actual industry examples
2. A specific challenge commonly faced in the industry
3. Proven solutions and methodologies
4. Realistic results based on industry standards
5. Key takeaways and lessons learned

Focus on established best practices and real industry examples. Avoid fictional companies - use "a leading tech company" or "a Fortune 500 organization" instead. Base metrics on real industry data and studies.

${contextPrompt}

Format the response as JSON with: title, content, excerpt, metrics (with realistic percentage and description).`;
    } else {
      userPrompt = `Write a fact-based, educational blog post about ${topic}. Include:
1. Current industry trends and developments (based on real data)
2. Established best practices and methodologies
3. Real-world applications and use cases
4. Industry insights and future outlook

Focus on verifiable information, established practices, and educational value. Cite industry standards and proven methodologies.

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