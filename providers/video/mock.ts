import {
  industrialPlaceholderImage,
  imageBufferToVideo,
} from "@/providers/studio/ffmpeg-visual";
import type { VideoProvider, VideoGenerateOptions, VideoResponse } from "./types";

/**
 * Local mock video — Ken Burns on text-free industrial still (not MOCK AI VIDEO cards).
 */
export class MockVideoProvider implements VideoProvider {
  readonly name = "mock";

  async generate(options: VideoGenerateOptions): Promise<VideoResponse> {
    const duration = Math.max(2, Math.min(options.duration, 10));
    const imageBuffer = await industrialPlaceholderImage(
      options.prompt,
      options.width,
      options.height,
    );

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
      cost: 0.15,
      isMock: true,
    };
  }
}
