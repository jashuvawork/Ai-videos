import { ProviderError } from "@/providers/shared/errors";
import {
  fetchPollinationsImage,
  hashSeed,
  imageBufferToVideo,
} from "@/providers/studio/ffmpeg-visual";
import { loadImageBuffer } from "@/providers/studio/image-utils";
import type { VideoProvider, VideoGenerateOptions, VideoResponse } from "./types";

/**
 * Motion video from AI stills — Pollinations image + FFmpeg Ken Burns (no Runway/OpenAI).
 */
export class StudioVideoProvider implements VideoProvider {
  readonly name = "studio";

  async generate(options: VideoGenerateOptions): Promise<VideoResponse> {
    const duration = Math.max(2, Math.min(options.duration, 12));
    const prompt = `${options.prompt}, cinematic motion, natural movement`;

    let imageBuffer: Buffer;

    if (options.referenceImagePath) {
      imageBuffer = await loadImageBuffer(options.referenceImagePath);
    } else if (options.referenceImageUrl) {
      imageBuffer = await loadImageBuffer(options.referenceImageUrl);
    } else {
      try {
        imageBuffer = await fetchPollinationsImage(
          prompt,
          options.width,
          options.height,
          hashSeed(prompt),
        );
      } catch (error) {
        throw new ProviderError(
          `Studio video needs an image: ${String(error)}`,
          "API_ERROR",
          true,
        );
      }
    }

    const videoBuffer = await imageBufferToVideo(
      imageBuffer,
      options.width,
      options.height,
      duration,
      30,
      options.cameraMovement || "slow zoom in",
    );

    return {
      videoBuffer,
      provider: this.name,
      width: options.width,
      height: options.height,
      duration,
      cost: 0,
      isMock: false,
    };
  }
}
