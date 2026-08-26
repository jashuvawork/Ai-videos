import { env } from "@/config/env";
import { ProviderError } from "@/providers/shared/errors";
import {
  clampRunwayDuration,
  downloadRunwayOutput,
  mapRunwayRatio,
  runwayRequest,
  waitForRunwayTask,
} from "@/providers/runway/client";
import type { VideoProvider, VideoGenerateOptions, VideoResponse } from "./types";

export class RunwayVideoProvider implements VideoProvider {
  readonly name = "runway";

  async generate(options: VideoGenerateOptions): Promise<VideoResponse> {
    const apiKey = env.VIDEO_API_KEY || env.RUNWAY_API_KEY;
    if (!apiKey) throw new ProviderError("Runway API key not configured", "AUTH_ERROR", false);

    const ratio = mapRunwayRatio(options.width, options.height);
    const duration = clampRunwayDuration(options.duration);
    const promptText = [
      options.prompt,
      "Cinematic, photorealistic motion, natural camera movement, high detail.",
    ].join(" ");

    let task;
    if (options.referenceImageUrl) {
      task = await runwayRequest(apiKey, "/v1/image_to_video", {
        model: "gen4_turbo",
        promptImage: options.referenceImageUrl,
        promptText: promptText.slice(0, 1000),
        ratio,
        duration,
      });
    } else {
      task = await runwayRequest(apiKey, "/v1/text_to_video", {
        model: "gen4.5",
        promptText: promptText.slice(0, 1000),
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
      cost: duration * 0.12,
      isMock: false,
    };
  }
}
