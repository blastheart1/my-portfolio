/**
 * AI Provider abstraction — server-side only.
 * Supports OpenAI and Anthropic Claude interchangeably.
 */

export type AIProviderName = 'openai' | 'claude';

export interface AIProviderConfig {
  id: string;
  provider: AIProviderName;
  model: string;
  temperature: number;
  max_tokens: number;
  use_knowledge: boolean;
  system_prompt_override: string | null;
  active: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIGenerateParams {
  userMessage: string;
  systemPrompt: string;
  history: ConversationMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

export interface AIGenerateResult {
  content: string;
  provider: AIProviderName;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

export async function generateWithOpenAI(
  params: AIGenerateParams
): Promise<AIGenerateResult> {
  const messages = [
    { role: 'system', content: params.systemPrompt },
    ...params.history.slice(-8), // last 8 turns for context
    { role: 'user', content: params.userMessage },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content as string,
    provider: 'openai',
    model: params.model,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  };
}

// ─── Anthropic Claude ─────────────────────────────────────────────────────────

export async function generateWithClaude(
  params: AIGenerateParams
): Promise<AIGenerateResult> {
  // Claude API uses system as a top-level field, not a messages role
  const messages: ConversationMessage[] = [
    ...params.history.slice(-8),
    { role: 'user', content: params.userMessage },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      system: params.systemPrompt,
      messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = Array.isArray(data.content)
    ? (data.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined)?.text ?? ''
    : '';

  return {
    content,
    provider: 'claude',
    model: params.model,
    promptTokens: data.usage?.input_tokens,
    completionTokens: data.usage?.output_tokens,
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function generateWithProvider(
  provider: AIProviderName,
  params: AIGenerateParams
): Promise<AIGenerateResult> {
  if (provider === 'claude') return generateWithClaude(params);
  return generateWithOpenAI(params);
}

// ─── Available models per provider ───────────────────────────────────────────

export const PROVIDER_MODELS: Record<AIProviderName, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-3.5-turbo',  label: 'GPT-3.5 Turbo (fast, cheap)' },
    { value: 'gpt-4o-mini',    label: 'GPT-4o Mini (balanced)' },
    { value: 'gpt-4o',         label: 'GPT-4o (best quality)' },
  ],
  claude: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
    { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (best quality)' },
  ],
};
