import { MockLLMProvider } from "@/providers/llm/mock";
import type { LLMProvider, LLMGenerateOptions, LLMResponse } from "./types";

/**
 * Built-in script engine — template-based story/scene generation with no external API.
 */
export class StudioLLMProvider implements LLMProvider {
  readonly name = "studio";
  private readonly inner = new MockLLMProvider();

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    const result = await this.inner.generate(options);
    return {
      ...result,
      provider: this.name,
      cost: 0,
    };
  }
}
