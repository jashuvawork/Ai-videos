import { ProviderError } from "@/providers/shared/errors";
import {
  dualImageBufferToVideo,
  fetchPollinationsImage,
  hashSeed,
  imageBufferToVideo,
  multiImageBufferToVideo,
} from "@/providers/studio/ffmpeg-visual";
import { loadImageBuffer } from "@/providers/studio/image-utils";
import { resolveCameraMovement } from "@/providers/studio/motion-engine";
import type { VideoProvider, VideoGenerateOptions, VideoResponse } from "./types";

const PROCESS_PROMPT_RE =
  /factory|conveyor|industrial|mixer|dough|biscuit|manufactur|production|stainless|oven|packaging|worker|assembly|smartphone|mobile phone|cell phone|phone making|pcb|smt|electronics|nova|robotic arm/i;

/**
 * Motion video: Pollinations stills + documentary camera motion (multi-frame crossfade when possible).
 * Falls back to enhanced FFmpeg motion — not a single frozen frame.
 */
export class StudioVideoProvider implements VideoProvider {
  readonly name = "studio";

  async generate(options: VideoGenerateOptions): Promise<VideoResponse> {
    const duration = Math.max(2, Math.min(options.duration, 12));
    const motionPrompt = [
      options.prompt,
      "hyper-realistic documentary footage",
      "active physical motion throughout",
      "workers and machines moving",
      "natural motion blur",
      "no visible text",
    ].join(", ");
    const movement = resolveCameraMovement(options.cameraMovement);

    let imageA: Buffer;
    let imageB: Buffer | null = null;

    if (options.referenceImagePath) {
      imageA = await loadImageBuffer(options.referenceImagePath);
    } else if (options.referenceImageUrl) {
      imageA = await loadImageBuffer(options.referenceImageUrl);
    } else {
      const seed = hashSeed(motionPrompt);
      imageA = await fetchPollinationsImage(
        motionPrompt,
        options.width,
        options.height,
        seed,
      );

      if (PROCESS_PROMPT_RE.test(options.prompt)) {
        try {
          imageB = await fetchPollinationsImage(
            `${motionPrompt}, continued action same scene, conveyor and machinery in motion`,
            options.width,
            options.height,
            seed + 1,
          );
          const imageC = await fetchPollinationsImage(
            `${motionPrompt}, alternate angle workers and machines moving`,
            options.width,
            options.height,
            seed + 2,
          );
          return {
            videoBuffer: await multiImageBufferToVideo(
              [imageA, imageB, imageC],
              options.width,
              options.height,
              duration,
              30,
              movement,
            ),
            provider: this.name,
            width: options.width,
            height: options.height,
            duration,
            cost: 0,
            isMock: false,
          };
        } catch {
          imageB = null;
        }
      }
    }

    const videoBuffer =
      imageB && !options.referenceImagePath && !options.referenceImageUrl
        ? await dualImageBufferToVideo(
            imageA,
            imageB,
            options.width,
            options.height,
            duration,
            30,
            movement,
          )
        : await imageBufferToVideo(
            imageA,
            options.width,
            options.height,
            duration,
            30,
            movement,
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
