import { env } from "@/config/env";
import { ProviderError } from "@/providers/shared/errors";
import type { ImageProvider, ImageGenerateOptions, ImageResponse } from "./types";

type DalleSize = "1024x1024" | "1024x1792" | "1792x1024";

function pickDalleSize(width: number, height: number): DalleSize {
  if (height > width * 1.15) return "1024x1792";
  if (width > height * 1.15) return "1792x1024";
  return "1024x1024";
}

function parseDalleDimensions(size: DalleSize): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w, height: h };
}

export class DalleImageProvider implements ImageProvider {
  readonly name = "dalle";

  async generate(options: ImageGenerateOptions): Promise<ImageResponse> {
    const apiKey = env.OPENAI_API_KEY || env.IMAGE_API_KEY || env.LLM_API_KEY;
    if (!apiKey) throw new ProviderError("OpenAI API key not configured", "AUTH_ERROR", false);

    const size = pickDalleSize(options.width, options.height);
    const prompt = [
      options.prompt,
      options.negativePrompt ? `Avoid: ${options.negativePrompt}` : "",
      "Photorealistic, cinematic lighting, high detail, no text overlays, no watermarks.",
    ]
      .filter(Boolean)
      .join(". ");

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.slice(0, 4000),
        n: 1,
        size,
        quality: "hd",
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) throw new ProviderError("OpenAI rate limit", "RATE_LIMIT", true);
      if (response.status === 401) throw new ProviderError("OpenAI auth failed", "AUTH_ERROR", false);
      throw new ProviderError(`DALL-E error: ${err}`, "API_ERROR", response.status >= 500);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new ProviderError("DALL-E returned no image", "API_ERROR", false);

    const dims = parseDalleDimensions(size);
    return {
      imageBuffer: Buffer.from(b64, "base64"),
      provider: this.name,
      width: dims.width,
      height: dims.height,
      cost: size === "1024x1024" ? 0.08 : 0.12,
      isMock: false,
    };
  }
}
