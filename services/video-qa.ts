import { execFile } from "child_process";
import { promisify } from "util";
import { access, readFile } from "fs/promises";

const execFileAsync = promisify(execFile);

export type VideoQAResult = {
  valid: boolean;
  issues: string[];
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  blackFrameRatio?: number;
};

/**
 * Post-render validation — do not silently ship broken MP4s.
 */
export class VideoQAService {
  async analyze(filePath: string): Promise<VideoQAResult> {
    const issues: string[] = [];

    try {
      await access(filePath);
    } catch {
      return { valid: false, issues: ["Output file does not exist"], hasAudio: false };
    }

    const buffer = await readFile(filePath);
    if (buffer.length < 10000) {
      issues.push(`File too small (${buffer.length} bytes) — likely corrupted or empty`);
    }

    let duration = 0;
    let width = 0;
    let height = 0;
    let fps = 0;
    let hasAudio = false;

    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=width,height,r_frame_rate,codec_type",
        "-of",
        "json",
        filePath,
      ]);
      const probe = JSON.parse(stdout);
      duration = parseFloat(probe.format?.duration || "0");
      const streams = probe.streams || [];
      const videoStream = streams.find((s: { codec_type?: string }) => s.codec_type === "video");
      const audioStream = streams.find((s: { codec_type?: string }) => s.codec_type === "audio");
      width = videoStream?.width ?? 0;
      height = videoStream?.height ?? 0;
      if (videoStream?.r_frame_rate) {
        const [n, d] = videoStream.r_frame_rate.split("/").map(Number);
        fps = d ? n / d : n;
      }
      hasAudio = Boolean(audioStream);
    } catch (e) {
      issues.push(`ffprobe failed: ${String(e)}`);
    }

    if (duration < 1) issues.push("Video duration under 1 second");
    if (width < 320 || height < 320) issues.push(`Resolution too low: ${width}x${height}`);

    let blackFrameRatio = 0;
    try {
      const { stderr } = await execFileAsync("ffmpeg", [
        "-i",
        filePath,
        "-vf",
        "blackdetect=d=0.98:pix_th=0.10",
        "-f",
        "null",
        "-",
      ]);
      const blackMatches = stderr.match(/black_duration:([\d.]+)/g) || [];
      const totalBlack = blackMatches.reduce((sum, m) => sum + parseFloat(m.split(":")[1]), 0);
      blackFrameRatio = duration > 0 ? totalBlack / duration : 0;
      if (blackFrameRatio > 0.5) {
        issues.push(`Excessive black frames (${(blackFrameRatio * 100).toFixed(0)}% of runtime)`);
      }
    } catch {
      // blackdetect optional
    }

    return {
      valid: issues.length === 0,
      issues,
      duration,
      width,
      height,
      fps,
      hasAudio,
      blackFrameRatio,
    };
  }
}
