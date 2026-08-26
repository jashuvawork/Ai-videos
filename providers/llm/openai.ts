import { env } from "@/config/env";
import type { LLMProvider } from "./types";
import { ProviderError } from "./types";
import { MockLLMProvider } from "./mock";

export class OpenAILLMProvider implements LLMProvider {
  readonly name = "openai";

  async generate(options: Parameters<LLMProvider["generate"]>[0]) {
    const apiKey = env.OPENAI_API_KEY || env.LLM_API_KEY;
    if (!apiKey) throw new ProviderError("OpenAI API key not configured", "AUTH_ERROR", false);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) throw new ProviderError("Rate limit exceeded", "RATE_LIMIT", true);
      if (response.status === 401) throw new ProviderError("Authentication failed", "AUTH_ERROR", false);
      throw new ProviderError(`OpenAI error: ${err}`, "API_ERROR", response.status >= 500);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const usage = data.usage;

    return {
      text,
      provider: this.name,
      usage: usage
        ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens }
        : undefined,
      cost: usage ? (usage.prompt_tokens * 0.00015 + usage.completion_tokens * 0.0006) / 1000 : undefined,
    };
  }
}

export function createLLMProvider(): LLMProvider {
  const provider = env.AI_TEXT_PROVIDER;
  if (provider === "openai" && (env.OPENAI_API_KEY || env.LLM_API_KEY)) {
    return new OpenAILLMProvider();
  }
  return new MockLLMProvider();
}
