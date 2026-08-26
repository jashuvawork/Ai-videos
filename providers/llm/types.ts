export interface LLMGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  text: string;
  provider: string;
  usage?: { inputTokens: number; outputTokens: number };
  cost?: number;
}

export interface LLMProvider {
  readonly name: string;
  generate(options: LLMGenerateOptions): Promise<LLMResponse>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
