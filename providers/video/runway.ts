import { findReadableLocalPath } from "@/storage/paths";
import {
  clampRunwayDuration,
  downloadRunwayOutput,
  getRunwayApiKey,
  mapRunwayRatio,
  runwayRequest,
  uploadEphemeralFile,
  uploadEphemeralBuffer,
  waitForRunwayTask,
} from "@/providers/runway/client";
import { ProviderError } from "@/providers/shared/errors";
import type { VideoProvider, VideoGenerateOptions, VideoResponse } from "./types";

function buildVideoPrompt(options: VideoGenerateOptions): string {
  const camera = options.cameraMovement
    ? `Camera movement: ${options.cameraMovement}.`
    : "Natural documentary camera movement with visible motion.";
  return [
    options.prompt,
    camera,
    "Photorealistic cinematic motion, continuous movement, no static frames, high detail.",
    options.negativePrompt ? `Avoid: ${options.negativePrompt}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1000);
}

async function resolvePromptImage(
  apiKey: string,
  options: VideoGenerateOptions,
): Promise<string | undefined> {
  if (options.referenceImagePath) {
    const readable = await findReadableLocalPath(options.referenceImagePath, [
      options.referenceImagePath,
    ]);
    if (readable) {
      return uploadEphemeralFile(apiKey, readable);
    }
  }

  if (options.referenceImageUrl) {
    if (options.referenceImageUrl.startsWith("runway://")) {
      return options.referenceImageUrl;
    }

    if (options.referenceImageUrl.startsWith("https://")) {
      try {
        const response = await fetch(options.referenceImageUrl, {
          signal: AbortSignal.timeout(60000),
        });
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const ext = options.referenceImageUrl.includes(".jpg") ? "jpg" : "png";
          return uploadEphemeralBuffer(apiKey, buffer, `reference.${ext}`);
        }
      } catch {
        // Fall through to URL passthrough
      }
      return options.referenceImageUrl;
    }
  }

  return undefined;
}

export class RunwayVideoProvider implements VideoProvider {
  readonly name = "runway";

  async generate(options: VideoGenerateOptions): Promise<VideoResponse> {
    const apiKey = getRunwayApiKey();
    if (!apiKey) throw new ProviderError("Runway API key not configured", "AUTH_ERROR", false);

    const ratio = mapRunwayRatio(options.width, options.height);
    const duration = clampRunwayDuration(options.duration);
    const promptText = buildVideoPrompt(options);
    const promptImage = await resolvePromptImage(apiKey, options);

    let task;
    if (promptImage) {
      task = await runwayRequest(apiKey, "/v1/image_to_video", {
        model: "gen4_turbo",
        promptImage,
        promptText,
        ratio,
        duration,
      });
    } else {
      task = await runwayRequest(apiKey, "/v1/text_to_video", {
        model: "gen4.5",
        promptText,
        ratio,
        duration,
      });
    }

    const outputUrl = await waitForRunwayTask(apiKey, task.id);
    const videoBuffer = await downloadRunwayOutput(outputUrl);

    return {
      videoBuffer,
      provider: this.name,
      width: options.width,
      height: options.height,
      duration,
      cost: duration * (promptImage ? 0.05 : 0.12),
      isMock: false,
    };
  }
}
