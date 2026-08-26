import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { VideoQAService } from "@/services/video-qa";

const execFileAsync = promisify(execFile);

const DARK_INDUSTRIAL = "/tmp/qa-dark-industrial.mp4";
const TRUE_BLACK = "/tmp/qa-true-black.mp4";

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
      TRUE_BLACK,
    ]);
  });

  it("passes dark industrial / cinematic footage (not true black)", async () => {
    if (!hasFfmpeg) return;
    await access(DARK_INDUSTRIAL);

    const qa = new VideoQAService();
    const result = await qa.analyze(DARK_INDUSTRIAL);

    expect(result.blackFrameRatio ?? 0).toBeLessThan(0.45);
    expect(result.valid).toBe(true);
    expect(result.meanLuma).toBeGreaterThan(0.03);
  });

  it("fails pitch-black corrupt output", async () => {
    if (!hasFfmpeg) return;
    await access(TRUE_BLACK);

    const qa = new VideoQAService();
    const result = await qa.analyze(TRUE_BLACK);

    expect(result.blackFrameRatio ?? 0).toBeGreaterThan(0.45);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("true black"))).toBe(true);
  });
});
