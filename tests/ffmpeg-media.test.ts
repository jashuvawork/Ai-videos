import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import { padVideoToDuration, probeVideoDuration } from "@/lib/ffmpeg-media";

const execFileAsync = promisify(execFile);

describe("ffmpeg media helpers", () => {
  let hasFfmpeg = false;

  beforeAll(async () => {
    try {
      await execFileAsync("ffmpeg", ["-version"]);
      hasFfmpeg = true;
    } catch {
      hasFfmpeg = false;
    }
  });

  it("loops a short clip out to the requested story beat", async () => {
    if (!hasFfmpeg) return;

    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x334455:s=320x568:d=1.2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "/tmp/qa-short-clip.mp4",
    ]);

    await padVideoToDuration("/tmp/qa-short-clip.mp4", "/tmp/qa-padded-clip.mp4", 4, 30, 320, 568);
    const duration = await probeVideoDuration("/tmp/qa-padded-clip.mp4");
    expect(duration).toBeGreaterThan(3.7);
    expect(duration).toBeLessThan(4.3);
  });
});
