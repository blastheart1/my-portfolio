import { NextRequest, NextResponse } from 'next/server';
import { generateContent, getRandomTopic, shouldGenerateCaseStudy } from '@/lib/openai-service';
import { insertBlogPost, getBlogPosts } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { topic, type } = await request.json();
    
    // Get recent content to avoid repetition
    const recentPosts = await getBlogPosts(5);
    
    const contentRequest = {
      topic: topic || getRandomTopic(),
      type: (type || (shouldGenerateCaseStudy() ? 'case-study' : 'blog')) as 'blog' | 'case-study',
      previousContent: recentPosts
    };

    const generatedContent = await generateContent(contentRequest);
    
    // Save to database
    const newPost = await insertBlogPost({
      title: generatedContent.title,
      content: generatedContent.content,
      excerpt: generatedContent.excerpt,
      type: contentRequest.type,
      topic: contentRequest.topic,
      metrics: generatedContent.metrics,
      sources: generatedContent.sources || [],
      caseStudyLink: generatedContent.caseStudyLink,
      published: true
    });

    return NextResponse.json({
      success: true,
      post: {
        id: newPost.id,
        ...generatedContent,
        type: contentRequest.type,
        topic: contentRequest.topic,
        createdAt: newPost.created_at
      }
    });
  } catch (error) {
    console.error('Error generating blog content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}