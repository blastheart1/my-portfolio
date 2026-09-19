/**
 * Minimal provider transport.
 *
 * Extracted from src/lib/demo/relay/pipeline.ts, where these were private. The
 * blog publish gate needs the same two calls and the same lenient JSON parse,
 * and a second hand-rolled copy of "POST to the chat completions endpoint"
 * is how two call sites quietly drift apart on timeout, error handling and
 * response shape.
 *
 * Deliberately not an SDK wrapper. The app already depends on the `openai`
 * package for content generation, but these paths want a plain fetch: one
 * fewer abstraction between the prompt and the wire when a response shape
 * surprises you, and no client instance to thread through a pure pipeline.
 *
 * The model is a parameter rather than a module constant. Relay's draft and
 * audit models and the blog gate's differ, and they should be free to.
 */

/** Ceiling on a single provider call, so a hung upstream cannot pin a route. */
const DEFAULT_TIMEOUT_MS = 30_000;

export interface CallOptions {
  /** Overrides the default per-call timeout. */
  timeoutMs?: number;
  /** Sampling temperature, where the provider accepts one. */
  temperature?: number;
  /** Upper bound on the reply, required by Anthropic and useful on OpenAI. */
  maxTokens?: number;
}

export async function callOpenAI(
  key: string,
  model: string,
  system: string,
  user: string,
  options: CallOptions = {}
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.6,
      // Asking for a JSON object is what makes parseJson's fenced-block
      // fallback a safety net rather than the normal path.
      response_format: { type: 'json_object' },
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);
  const body = await res.json();
  return body.choices?.[0]?.message?.content ?? '';
}

export async function callAnthropic(
  key: string,
  model: string,
  system: string,
  user: string,
  options: CallOptions = {}
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic responded ${res.status}`);
  const body = await res.json();
  return body.content?.[0]?.text ?? '';
}

/**
 * Parses a model's JSON reply, returning the fallback rather than throwing.
 *
 * Every caller here is on a path where a malformed reply should degrade to a
 * known state, never raise. `JSON.parse` on a model reply is otherwise a
 * reliable way to turn "the model wrote prose today" into a 500.
 */
export function parseJson<T>(raw: string, fallback: T): T {
  try {
    // Models occasionally wrap JSON in a fenced block despite instructions.
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
