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

    const systemPrompt = `You are Antonio Luis Santos, a software engineer and technical consultant with expertise in ${topic}. Write in first person, sharing your personal experiences, insights, and professional knowledge. Create authentic, fact-based content that reflects real industry experience and provides genuine value to readers. Focus on practical insights, real challenges faced, and proven solutions you've implemented or observed.`;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Write a personal case study about ${topic} based on your professional experience. Include:
1. A real project or scenario you've worked on (use "I" and "my experience")
2. Specific challenges you faced and how you solved them
3. The technical approach and tools you used
4. Measurable results and outcomes you achieved
5. Key lessons learned and insights gained

Write as Antonio Luis Santos sharing his professional experience. Be specific about technologies, methodologies, and results. Use realistic metrics based on industry standards.

${contextPrompt}

Format the response as JSON with: title, content, excerpt, metrics (with realistic percentage and description).`;
    } else {
      userPrompt = `Write a personal blog post about ${topic} sharing your professional insights and experience. Include:
1. Your perspective on current trends and developments
2. Best practices you've learned and implemented
3. Real projects and applications you've worked on
4. Your thoughts on the future of the field
5. Practical tips and advice for other developers

Write in first person as Antonio Luis Santos, sharing your authentic professional experience and knowledge. Be conversational but informative.

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