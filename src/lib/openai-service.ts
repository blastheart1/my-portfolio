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

    const systemPrompt = `You are Antonio Luis Santos, a senior software engineer and technical consultant with deep expertise in ${topic}. Write in first person, sharing your professional insights, controversial takes, and detailed technical knowledge. Provide smart, opinionated analysis based on real industry experience. Include specific technologies, methodologies, and concrete examples. Be detailed, technical, and provide unique perspectives that demonstrate deep expertise.`;

    let userPrompt = '';
    
    if (type === 'case-study') {
      userPrompt = `Write a detailed case study about ${topic} based on your professional experience. Include:
1. A specific real project you led or contributed to (use "I" and "my experience")
2. The exact technical challenges you faced and your unique solutions
3. Specific technologies, frameworks, and tools you used (mention exact versions)
4. Detailed technical implementation approach
5. Measurable results with specific metrics and data
6. Controversial takes or contrarian insights you discovered
7. Key technical lessons and advanced insights gained
8. References to specific industry sources, documentation, or research

Write as Antonio Luis Santos sharing deep technical expertise. Be opinionated, detailed, and include specific technical details. Mention exact tools, versions, and methodologies.

${contextPrompt}

Format the response as JSON with: title, content, excerpt, metrics (with realistic percentage and description), sources (array of source objects with title and url).`;
    } else {
      userPrompt = `Write a detailed, opinionated blog post about ${topic} sharing your professional insights and controversial takes. Include:
1. Your contrarian perspective on current industry trends and why popular approaches might be wrong
2. Specific technical best practices you've developed through experience
3. Detailed real projects with exact technologies and implementation details
4. Your predictions for the future with technical reasoning
5. Advanced tips and techniques that most developers don't know
6. Specific tools, frameworks, and methodologies you recommend
7. References to documentation, research papers, or industry sources
8. Technical deep-dives with code examples or architectural decisions

Write in first person as Antonio Luis Santos, sharing deep technical expertise and contrarian insights. Be detailed, technical, and opinionated.

${contextPrompt}

Format the response as JSON with: title, content, excerpt, sources (array of source objects with title and url).`;
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