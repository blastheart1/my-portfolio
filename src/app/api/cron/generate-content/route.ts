import { NextRequest, NextResponse } from 'next/server';
import { generateContent, getRandomTopic, shouldGenerateCaseStudy } from '@/lib/openai-service';
import { insertBlogPost, getBlogPosts, getLatestBlogPost } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we already generated content today
    const latestPost = await getLatestBlogPost();
    const now = new Date();
    const latestPostDate = latestPost ? new Date(latestPost.createdAt) : new Date(0);
    
    // If latest post is less than 2 days old, skip generation
    const daysSinceLastPost = (now.getTime() - latestPostDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPost < 2) {
      return NextResponse.json({
        success: true,
        message: 'Content already generated recently, skipping...',
        daysSinceLastPost: Math.round(daysSinceLastPost)
      });
    }

    // Get recent content to avoid repetition
    const recentPosts = await getBlogPosts(5);
    
    const contentRequest = {
      topic: getRandomTopic(),
      type: (shouldGenerateCaseStudy() ? 'case-study' : 'blog') as 'blog' | 'case-study',
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
      published: true
    });

    return NextResponse.json({
      success: true,
      message: 'Content generated successfully',
      post: {
        id: newPost.id,
        title: generatedContent.title,
        type: contentRequest.type,
        topic: contentRequest.topic
      }
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}