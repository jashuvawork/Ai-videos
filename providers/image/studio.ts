import { env } from "@/config/env";
import { ProviderError } from "@/providers/shared/errors";
import {
  cinematicPlaceholderImage,
  fetchPollinationsImage,
  hashSeed,
} from "@/providers/studio/ffmpeg-visual";
import type { ImageProvider, ImageGenerateOptions, ImageResponse } from "./types";

/**
 * Free AI images via Pollinations (no API key). Falls back to cinematic FFmpeg placeholder.
 */
export class StudioImageProvider implements ImageProvider {
  readonly name = "studio";

  async generate(options: ImageGenerateOptions): Promise<ImageResponse> {
    const prompt = [
      options.prompt,
      "cinematic photorealistic, dramatic lighting, film still, 8k detail",
      options.negativePrompt ? `avoid ${options.negativePrompt}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const imageBuffer = await fetchPollinationsImage(
        prompt,
        options.width,
        options.height,
        options.seed ?? hashSeed(prompt),
      );

      return {
        imageBuffer,
        provider: this.name,
        width: options.width,
        height: options.height,
        cost: 0,
        isMock: false,
      };
    } catch (error) {
      if (env.STUDIO_ALLOW_PLACEHOLDER_FALLBACK !== "false") {
        const imageBuffer = await cinematicPlaceholderImage(
          options.prompt,
          options.width,
          options.height,
        );
        return {
          imageBuffer,
          provider: this.name,
          width: options.width,
          height: options.height,
          cost: 0,
          isMock: false,
        };
      }
      throw new ProviderError(
        `Studio image generation failed: ${String(error)}`,
        "API_ERROR",
        true,
      );
    }
  }
}
