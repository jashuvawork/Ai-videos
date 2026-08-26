import { ProviderError } from "@/providers/shared/errors";
import {
  createCursorAgentRun,
  getCursorApiKey,
  waitForCursorRun,
} from "@/providers/cursor/client";
import { StudioLLMProvider } from "@/providers/llm/studio";
import type { LLMProvider, LLMGenerateOptions, LLMResponse } from "./types";

/**
 * Uses Cursor Cloud Agents API (Composer models) for script/metadata generation.
 * Falls back to built-in Studio templates if the agent API is unavailable.
 */
export class CursorLLMProvider implements LLMProvider {
  readonly name = "cursor";
  private readonly fallback = new StudioLLMProvider();

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    if (!getCursorApiKey()) {
      return this.fallback.generate(options);
    }

    const system = options.systemPrompt
      ? `${options.systemPrompt}\n\nRespond with valid JSON only when jsonMode is requested.`
      : undefined;

    const prompt = [
      system,
      options.prompt,
      options.jsonMode ? "\n\nReturn ONLY valid JSON, no markdown fences." : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const { agentId, runId } = await createCursorAgentRun(prompt);
      const result = await waitForCursorRun(agentId, runId);
      const text = (result.text ?? "").trim();

      if (!text) {
        throw new ProviderError("Cursor returned empty text", "API_ERROR", true);
      }

      return {
        text,
        provider: this.name,
        cost: 0.05,
      };
    } catch (error) {
      console.warn("[CursorLLM] Falling back to studio:", error);
      const fallback = await this.fallback.generate(options);
      return { ...fallback, provider: `${this.name}+studio` };
    }
  }
}
