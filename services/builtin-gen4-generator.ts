import {
  dualImageBufferToVideo,
  fetchPollinationsImage,
  hashSeed,
  multiImageBufferToVideo,
} from "@/providers/studio/ffmpeg-visual";
import { resolveCameraMovement } from "@/providers/studio/motion-engine";

export interface BuiltinGen4Options {
  prompt: string;
  width: number;
  height: number;
  duration: number;
  imageBuffer?: Buffer;
  onProgress?: (progress: number) => void | Promise<void>;
}

function buildGen4MotionPrompt(prompt: string): string {
  return [
    prompt,
    "hyper-realistic documentary footage",
    "continuous physical motion",
    "workers machines conveyor steam",
    "natural motion blur",
    "cinematic lighting",
    "no visible text",
    "no watermark",
  ].join(", ");
}

function inferCameraFromPrompt(prompt: string): string {
  const t = prompt.toLowerCase();
  if (t.includes("overhead")) return "overhead tracking";
  if (t.includes("handheld")) return "handheld documentary";
  if (t.includes("tracking") || t.includes("conveyor")) return "tracking lateral";
  if (t.includes("zoom in")) return "push in";
  if (t.includes("zoom out")) return "pull out";
  return resolveCameraMovement(prompt);
}

/**
 * Built-in Gen-4 style motion video — Pollinations stills + multi-frame FFmpeg motion.
 * No external video API keys required.
 */
export class BuiltinGen4Generator {
  async generate(options: BuiltinGen4Options): Promise<Buffer> {
    const duration = Math.max(2, Math.min(options.duration, 10));
    const motionPrompt = buildGen4MotionPrompt(options.prompt);
    const movement = inferCameraFromPrompt(options.prompt);
    const report = async (p: number) => {
      if (options.onProgress) await options.onProgress(p);
    };

    await report(10);

    if (options.imageBuffer) {
      await report(20);
      const seed = hashSeed(motionPrompt);
      let imageB: Buffer | null = null;
      let imageC: Buffer | null = null;

      try {
        imageB = await fetchPollinationsImage(
          `${motionPrompt}, same scene continued action, machinery and workers moving`,
          options.width,
          options.height,
          seed + 1,
        );
        await report(40);
        imageC = await fetchPollinationsImage(
          `${motionPrompt}, alternate angle same environment, active production line`,
          options.width,
          options.height,
          seed + 2,
        );
        await report(55);
      } catch {
        imageB = null;
        imageC = null;
      }

      await report(65);

      if (imageB && imageC) {
        const video = await multiImageBufferToVideo(
          [options.imageBuffer, imageB, imageC],
          options.width,
          options.height,
          duration,
          30,
          movement,
        );
        await report(95);
        return video;
      }

      if (imageB) {
        const video = await dualImageBufferToVideo(
          options.imageBuffer,
          imageB,
          options.width,
          options.height,
          duration,
          30,
          movement,
        );
        await report(95);
        return video;
      }

      const { imageBufferToVideo } = await import("@/providers/studio/ffmpeg-visual");
      const video = await imageBufferToVideo(
        options.imageBuffer,
        options.width,
        options.height,
        duration,
        30,
        movement,
      );
      await report(95);
      return video;
    }

    const seed = hashSeed(motionPrompt);
    await report(15);

    const imageA = await fetchPollinationsImage(
      motionPrompt,
      options.width,
      options.height,
      seed,
    );
    await report(30);

    let imageB: Buffer | null = null;
    let imageC: Buffer | null = null;

    try {
      imageB = await fetchPollinationsImage(
        `${motionPrompt}, continued motion same scene, conveyor belts moving`,
        options.width,
        options.height,
        seed + 1,
      );
      await report(45);
      imageC = await fetchPollinationsImage(
        `${motionPrompt}, action moment workers and machines in motion`,
        options.width,
        options.height,
        seed + 2,
      );
      await report(55);
    } catch {
      imageB = null;
      imageC = null;
    }

    await report(65);

    if (imageB && imageC) {
      const video = await multiImageBufferToVideo(
        [imageA, imageB, imageC],
        options.width,
        options.height,
        duration,
        30,
        movement,
      );
      await report(95);
      return video;
    }

    if (imageB) {
      const video = await dualImageBufferToVideo(
        imageA,
        imageB,
        options.width,
        options.height,
        duration,
        30,
        movement,
      );
      await report(95);
      return video;
    }

    const { imageBufferToVideo } = await import("@/providers/studio/ffmpeg-visual");
    const video = await imageBufferToVideo(imageA, options.width, options.height, duration, 30, movement);
    await report(95);
    return video;
  }
}
