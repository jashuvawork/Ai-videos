import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import { access, readFile, writeFile } from "fs/promises";
import { VideoQAService } from "@/services/video-qa";
import { imageBufferToVideo } from "@/providers/studio/ffmpeg-visual";

const execFileAsync = promisify(execFile);

const DARK_INDUSTRIAL = "/tmp/qa-dark-industrial.mp4";
const STATIC_BLACK = "/tmp/qa-static-black.mp4";
const MOTION_CLIP = "/tmp/qa-motion-clip.mp4";

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

describe("VideoQAService", () => {
  let hasFfmpeg = false;

  beforeAll(async () => {
    hasFfmpeg = await ffmpegAvailable();
    if (!hasFfmpeg) return;

    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=0x1a2228:s=512x910:d=5`,
      "-vf",
      "vignette=angle=PI/4,noise=alls=12:allf=t+u,eq=brightness=-0.05:contrast=1.05",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      DARK_INDUSTRIAL,
    ]);

    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=512x910:d=15",
      "-c:v",
      "libx264",
      "-b:v",
      "400k",
      "-pix_fmt",
      "yuv420p",
      STATIC_BLACK,
    ]);

    const still = await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x445566:s=512x910:d=1",
      "-frames:v",
      "1",
      "/tmp/qa-motion-still.png",
    ]);
    void still;
    const png = await readFile("/tmp/qa-motion-still.png");
    const motionBuf = await imageBufferToVideo(
      png,
      512,
      910,
      5,
      30,
      "slow lateral tracking shot following product on belt",
    );
    await writeFile(MOTION_CLIP, motionBuf);
  });

  it("passes dark industrial footage without failing QA", async () => {
    if (!hasFfmpeg) return;
    await access(DARK_INDUSTRIAL);

    const qa = new VideoQAService();
    const result = await qa.analyze(DARK_INDUSTRIAL);

    expect(result.valid).toBe(true);
    expect(result.meanLuma).toBeGreaterThan(0.03);
  });

  it("fails fully static stuck footage", async () => {
    if (!hasFfmpeg) return;
    await access(STATIC_BLACK);

    const qa = new VideoQAService();
    const result = await qa.analyze(STATIC_BLACK);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("frozen") || i.includes("stuck"))).toBe(true);
  });

  it("passes documentary motion clips with visible camera movement", async () => {
    if (!hasFfmpeg) return;
    await access(MOTION_CLIP);

    const qa = new VideoQAService();
    const result = await qa.analyze(MOTION_CLIP);

    expect(result.valid).toBe(true);
    expect(result.frozenFrameRatio ?? 1).toBeLessThan(0.5);
  });
});
