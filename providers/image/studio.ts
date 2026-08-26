import { env } from "@/config/env";
import { ProviderError } from "@/providers/shared/errors";
import {
  fetchPollinationsImage,
  hashSeed,
  industrialPlaceholderImage,
} from "@/providers/studio/ffmpeg-visual";
import type { ImageProvider, ImageGenerateOptions, ImageResponse } from "./types";

const PROCESS_PROMPT_RE =
  /factory|conveyor|industrial|mixer|dough|biscuit|manufactur|production|stainless|oven|packaging|worker|assembly|smartphone|mobile phone|cell phone|phone making|pcb|smt|electronics assembly|nova|robotic arm|assembly line/i;

function buildStudioImagePrompt(options: ImageGenerateOptions): string {
  const isProcess = PROCESS_PROMPT_RE.test(options.prompt);
  const parts = [options.prompt];

  if (isProcess) {
    parts.push(
      "hyper-realistic industrial documentary photograph",
      "active factory production in motion",
      "machines workers conveyors robotic arms in operation",
      "natural factory lighting",
      "workers operating equipment not posing at camera",
      "no film crew no camera operator no cinema camera in frame",
      "no visible text no titles no watermarks",
    );
  } else {
    parts.push("cinematic photorealistic, dramatic lighting, film still, 8k detail");
  }

  if (options.negativePrompt) {
    parts.push(`avoid ${options.negativePrompt}`);
  }

  return parts.filter(Boolean).join(", ");
}

/**
 * Free AI images via Pollinations (no API key). Falls back to text-free industrial placeholder.
 */
export class StudioImageProvider implements ImageProvider {
  readonly name = "studio";

  async generate(options: ImageGenerateOptions): Promise<ImageResponse> {
    const prompt = buildStudioImagePrompt(options);

    try {
      const imageBuffer = await fetchPollinationsImage(
        prompt,
        options.width,
        options.height,
        options.seed ?? hashSeed(prompt),
        options.negativePrompt,
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
        const imageBuffer = await industrialPlaceholderImage(
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
