import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readFile, unlink } from "fs/promises";
import { join, dirname } from "path";
import {
  ReferenceStyleProfileSchema,
  type ReferenceStyleProfile,
} from "@/lib/schemas/reference-style";

const execFileAsync = promisify(execFile);

/**
 * Analyzes reference video for STYLE ONLY — never copies content, logos, or characters.
 */
export class ReferenceAnalysisService {
  async analyze(videoPath: string): Promise<ReferenceStyleProfile> {
    const probe = await this.probeVideo(videoPath);
    const aspectRatio = probe.width >= probe.height ? "16:9" : "9:16";

  const framePath = await this.extractSampleFrame(videoPath, probe.duration);
    const frameStats = await this.analyzeFrame(framePath);
    await unlink(framePath).catch(() => {});

    const profile: ReferenceStyleProfile = {
      aspectRatio,
      visualStyle: frameStats.isDarkMoody
        ? "cinematic photorealistic documentary, intimate close framing, muted film-like tones"
        : "high-end industrial documentary, photorealistic real-world footage",
      lighting: frameStats.isDarkMoody
        ? "soft dramatic low-key lighting, natural shadows, shallow depth of field"
        : "clean industrial LED factory lighting with realistic shadows",
      cameraStyle: frameStats.isPortraitLike
        ? "controlled documentary camera, static or slow push-in, minimal movement — apply ONLY to compatible process shots, never portrait montage"
        : "professional documentary cinematography, controlled tracking, one or two subjects with simple motion",
      shotTypes: frameStats.isPortraitLike
        ? ["close-up", "medium close-up"]
        : ["wide establishing", "medium production shot", "close-up machinery", "tracking conveyor"],
      pacing: probe.duration < 45 ? "fast cuts between action beats" : "deliberate documentary pacing",
      colorTreatment: frameStats.isDarkMoody
        ? "muted cinematic color grading, slightly desaturated, cool shadows"
        : "natural color grading, realistic material colors, subtle warmth",
      depthOfField: frameStats.isPortraitLike
        ? "shallow depth of field, soft background bokeh"
        : "selective shallow DOF on close-ups, deeper focus on wide factory shots",
      composition: aspectRatio === "9:16"
        ? "vertical 9:16, subject centered in mobile safe area, avoid top UI and bottom caption zones"
        : "widescreen 16:9 documentary composition with environmental context",
      transitions: ["straight cut", "match cut on motion"],
      realismLevel: "hyper-realistic documentary",
      negativeStyleElements: this.buildNegativeElements(frameStats),
    };

    return ReferenceStyleProfileSchema.parse(profile);
  }

  applyToPrompt(basePrompt: string, style: ReferenceStyleProfile): string {
    return [
      basePrompt,
      `STYLE GUIDE (reference only, original content): ${style.visualStyle}`,
      style.lighting,
      style.cameraStyle,
      style.colorTreatment,
      style.depthOfField,
      style.composition,
      "Do not copy reference characters logos watermarks or copyrighted creative assets",
    ].join(". ");
  }

  private async probeVideo(path: string): Promise<{ duration: number; width: number; height: number }> {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      path,
    ]);
    const data = JSON.parse(stdout);
    return {
      duration: parseFloat(data.format?.duration || "30"),
      width: data.streams?.[0]?.width ?? 1080,
      height: data.streams?.[0]?.height ?? 1920,
    };
  }

  private async extractSampleFrame(videoPath: string, duration: number): Promise<string> {
    const outDir = join(dirname(videoPath), "analysis");
    await mkdir(outDir, { recursive: true });
    const framePath = join(outDir, `frame-${Date.now()}.jpg`);
    const seek = Math.max(0.5, duration * 0.35);
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      String(seek),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      framePath,
    ]);
    return framePath;
  }

  private async analyzeFrame(framePath: string): Promise<{
    isDarkMoody: boolean;
    isPortraitLike: boolean;
    avgBrightness: number;
  }> {
    try {
      const { stdout } = await execFileAsync("ffmpeg", [
        "-i",
        framePath,
        "-vf",
        "scale=64:64,format=gray",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "gray",
        "-",
      ]);
      const buf = Buffer.from(stdout);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = buf.length ? sum / buf.length : 128;
      return {
        avgBrightness: avg,
        isDarkMoody: avg < 100,
        isPortraitLike: avg < 110, // heuristic: dark intimate frames often portrait-style refs
      };
    } catch {
      return { avgBrightness: 128, isDarkMoody: false, isPortraitLike: false };
    }
  }

  private buildNegativeElements(stats: { isPortraitLike: boolean; isDarkMoody: boolean }): string[] {
    const base = [
      "title cards",
      "gradient interstitial slides",
      "text overlays in generated imagery",
      "watermarks",
      "logos",
      "copyrighted characters from reference",
    ];
    if (stats.isPortraitLike) {
      base.push(
        "portrait montage without factory action",
        "fashion model posing at camera",
        "replacing manufacturing with face close-ups",
      );
    }
    return base;
  }
}
