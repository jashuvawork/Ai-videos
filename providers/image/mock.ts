import { execFile } from "child_process";
import { promisify } from "util";
import type { ImageProvider, ImageGenerateOptions, ImageResponse } from "./types";

const execFileAsync = promisify(execFile);

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generate(options: ImageGenerateOptions): Promise<ImageResponse> {
    const hue = hashHue(options.prompt);
    const color = "0x" + hue;
    const tmpPath = `/tmp/mock-img-${Date.now()}.png`;

    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=${color}:s=${options.width}x${options.height}:d=1`,
      "-vf",
      `drawtext=text='MOCK AI IMAGE':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-30,drawtext=text='${sanitize(options.prompt.slice(0, 40))}':fontsize=14:fontcolor=gray:x=(w-text_w)/2:y=(h-text_h)/2+10`,
      "-frames:v", "1",
      tmpPath,
    ]);

    const { readFile } = await import("fs/promises");
    const imageBuffer = await readFile(tmpPath);
    const { unlink } = await import("fs/promises");
    await unlink(tmpPath).catch(() => {});

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

function hashHue(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  const r = ((hash >> 16) & 0xff) + 40;
  const g = ((hash >> 8) & 0xff) + 40;
  const b = (hash & 0xff) + 40;
  const rr = Math.min(255, r).toString(16).padStart(2, "0");
  const gg = Math.min(255, g).toString(16).padStart(2, "0");
  const bb = Math.min(255, b).toString(16).padStart(2, "0");
  return rr + gg + bb;
}

function sanitize(text: string): string {
  return text.replace(/[':\\\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}
