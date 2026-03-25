import { NextResponse } from 'next/server';
import { loadKnowledgeContext } from '@/lib/chatbot/knowledgeLoader';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const context = loadKnowledgeContext();
    return NextResponse.json(
      { context },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('GET /api/chatbot/knowledge error:', err);
    return NextResponse.json({ context: '' });
  }
}
