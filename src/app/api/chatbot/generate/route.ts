import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/neon';
import { loadKnowledgeContext } from '@/lib/chatbot/knowledgeLoader';
import {
  generateWithProvider,
  type AIProviderConfig,
  type ConversationMessage,
} from '@/lib/chatbot/aiProviders';

export const runtime = 'nodejs';

// Cache active config for 30s to avoid a DB round-trip per message
let configCache: AIProviderConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 30_000;

async function getActiveConfig(): Promise<AIProviderConfig | null> {
  const now = Date.now();
  if (configCache && now - configCacheTime < CONFIG_CACHE_TTL) return configCache;

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM ai_config WHERE active = true LIMIT 1
    `) as unknown as AIProviderConfig[];

    if (!rows.length) return null;
    configCache = rows[0];
    configCacheTime = now;
    return configCache;
  } catch {
    return null;
  }
}

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
});

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(MessageSchema).max(20).optional().default([]),
});

// Minimal fallback system prompt when no knowledge files exist
const FALLBACK_SYSTEM_PROMPT =
  'You are Luis Santos, a Full-Stack Developer and QA Specialist based in Manila, Philippines. ' +
  'Answer questions about his professional services, skills, and experience in a friendly, concise manner.';

const RESPONSE_STYLE_INSTRUCTIONS = `

RESPONSE STYLE:
- Respond in first person as Luis
- Be professional but friendly and conversational
- Keep responses concise: 2–3 sentences max unless detail is explicitly requested
- Use **bold** for key terms, bullet points for lists
- If asked about topics outside your expertise, politely redirect to your services
- Build on conversation context naturally
- FORMATTING: Use simple markdown — bold, bullets, line breaks only`;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { message, history } = parsed.data;

  // 1. Get active AI config from DB
  const config = await getActiveConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'No AI provider configured. Set an active config in /edit/chatbot.' },
      { status: 503 }
    );
  }

  // 2. Resolve API key from env vars
  const apiKey =
    config.provider === 'claude'
      ? process.env.ANTHROPIC_API_KEY ?? ''
      : process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? '';

  if (!apiKey) {
    return NextResponse.json(
      {
        error: `API key not configured for provider '${config.provider}'. ` +
          `Set ${config.provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} in your environment.`,
      },
      { status: 503 }
    );
  }

  // 3. Build system prompt
  let systemPrompt = '';

  if (config.use_knowledge) {
    const knowledge = loadKnowledgeContext();
    systemPrompt = knowledge || FALLBACK_SYSTEM_PROMPT;
  } else {
    systemPrompt = FALLBACK_SYSTEM_PROMPT;
  }

  // System prompt override from admin (replaces base, keeps style instructions)
  if (config.system_prompt_override?.trim()) {
    systemPrompt = config.system_prompt_override.trim();
  }

  systemPrompt += RESPONSE_STYLE_INSTRUCTIONS;

  // 4. Call AI provider
  try {
    const result = await generateWithProvider(config.provider, {
      userMessage: message,
      systemPrompt,
      history: history as ConversationMessage[],
      model: config.model,
      temperature: Number(config.temperature),
      maxTokens: config.max_tokens,
      apiKey,
    });

    return NextResponse.json({
      content: result.content,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    console.error(`[/api/chatbot/generate] ${config.provider} error:`, err);
    return NextResponse.json(
      { error: 'AI provider failed. Please try again.' },
      { status: 502 }
    );
  }
}
