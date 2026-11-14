/**
 * Minimal OpenRouter chat-completions client with model fallback.
 *
 * Only call this from Convex *actions*: queries and mutations are not allowed
 * to perform network requests. The API key is read from the Convex
 * environment variable `OPENROUTER_API_KEY` and never from source code.
 */

export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.1-8b-instruct',
  'google/gemini-flash-1.5',
] as const;

export interface CompletionOptions {
  models?: readonly string[];
  maxTokens?: number;
  temperature?: number;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export class OpenRouterConfigError extends Error {
  constructor() {
    super('OPENROUTER_API_KEY is not configured on the Convex deployment');
    this.name = 'OpenRouterConfigError';
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Sends `prompt` to each model in turn and returns the first response for
 * which `parse` returns a non-null value. Throws if every model fails.
 */
export async function completeWithFallback<T>(
  prompt: string,
  parse: (content: string) => T | null,
  options: CompletionOptions = {},
): Promise<T> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterConfigError();
  }
  const doFetch = options.fetchImpl ?? fetch;
  const models = options.models ?? DEFAULT_MODELS;
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await doFetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Smart Street',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens ?? 1000,
          temperature: options.temperature ?? 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = parse(content);
        if (parsed !== null) {
          return parsed;
        }
        lastError = new Error(`Model ${model} returned an unparseable response`);
      }
    } catch (error) {
      lastError = error;
      console.error(`OpenRouter model ${model} failed:`, error);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : 'all models failed';
  throw new Error(`AI request failed: ${reason}`);
}

/** Extracts the first JSON array (`[...]`) or object (`{...}`) embedded in text. */
export function extractJson(content: string, kind: 'array' | 'object'): unknown {
  const pattern = kind === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = content.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
