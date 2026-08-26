import { execFile } from "child_process";
import { promisify } from "util";
import type { VideoProvider, VideoGenerateOptions, VideoResponse } from "./types";

const execFileAsync = promisify(execFile);

export class MockVideoProvider implements VideoProvider {
  readonly name = "mock";

  async generate(options: VideoGenerateOptions): Promise<VideoResponse> {
    const duration = Math.max(2, Math.min(options.duration, 10));
    const hue = options.prompt.length * 17;
    const color = `0x${((hue & 0xffffff) | 0x202020).toString(16).padStart(6, "0")}`;
    const tmpPath = `/tmp/mock-vid-${Date.now()}.mp4`;

    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=${color}:s=${options.width}x${options.height}:d=${duration}`,
      "-vf",
      `drawtext=text='MOCK AI VIDEO':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-t", String(duration),
      tmpPath,
    ]);

    const { readFile, unlink } = await import("fs/promises");
    const videoBuffer = await readFile(tmpPath);
    await unlink(tmpPath).catch(() => {});

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
