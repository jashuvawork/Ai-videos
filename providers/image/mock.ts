import { industrialPlaceholderImage } from "@/providers/studio/ffmpeg-visual";
import type { ImageProvider, ImageGenerateOptions, ImageResponse } from "./types";

/**
 * Local mock images — text-free industrial placeholders (not gradient title cards).
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generate(options: ImageGenerateOptions): Promise<ImageResponse> {
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
      cost: 0.02,
      isMock: true,
    };
  }
}
