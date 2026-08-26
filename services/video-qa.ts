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
  meanLuma?: number;
};

/** Minimum contiguous near-black run (seconds) before counting as corrupt footage */
const BLACK_MIN_DURATION_SEC = 0.75;
/** Fraction of pixels that must be near-black for a frame to count as black */
const PICTURE_BLACK_RATIO_TH = 0.98;
/** Pixel luminance threshold (0–1); only near #000000 counts — not dark industrial/cinematic grades */
const PIXEL_BLACK_TH = 0.02;
/** Fail only when most of the runtime is true black (missing assets / corrupt render) */
const MAX_TRUE_BLACK_RATIO = 0.45;

/**
 * Post-render validation — do not silently ship broken MP4s.
 * Tolerates intentional dark cinematography; flags pitch-black corruption.
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
        "-select_streams",
        "v:0",
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
    let meanLuma: number | undefined;

    try {
      const { stderr } = await execFileAsync("ffmpeg", [
        "-i",
        filePath,
        "-vf",
        `blackdetect=d=${BLACK_MIN_DURATION_SEC}:pixel_black_th=${PIXEL_BLACK_TH}:picture_black_ratio_th=${PICTURE_BLACK_RATIO_TH}`,
        "-f",
        "null",
        "-",
      ]);
      blackFrameRatio = computeBlackCoverage(stderr, duration);
    } catch {
      // blackdetect optional
    }

    try {
      meanLuma = await probeMeanLuma(filePath);
    } catch {
      // signalstats optional
    }

    if (blackFrameRatio > MAX_TRUE_BLACK_RATIO) {
      const nearlyAllBlack = blackFrameRatio > 0.85;
      const lowLuma = meanLuma === undefined || meanLuma < 0.08;
      if (nearlyAllBlack || lowLuma) {
        issues.push(
          `Excessive true black frames (${(blackFrameRatio * 100).toFixed(0)}% of runtime) — likely missing or corrupt scene assets`,
        );
      }
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
      meanLuma,
    };
  }
}

function computeBlackCoverage(stderr: string, duration: number): number {
  if (duration <= 0) return 0;

  const segments: Array<{ start: number; end: number }> = [];
  const regex = /black_start:([\d.]+)\s+black_end:([\d.]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stderr)) !== null) {
    segments.push({ start: parseFloat(match[1]), end: parseFloat(match[2]) });
  }

  if (segments.length === 0) return 0;

  const sorted = segments.sort((a, b) => a.start - b.start);
  let covered = 0;
  let cursor = 0;

  for (const seg of sorted) {
    const start = Math.max(seg.start, cursor);
    const end = Math.max(seg.end, start);
    if (end > start) {
      covered += end - start;
      cursor = end;
    }
  }

  return Math.min(1, covered / duration);
}

async function probeMeanLuma(filePath: string): Promise<number> {
  const { stdout, stderr } = await execFileAsync("ffmpeg", [
    "-i",
    filePath,
    "-vf",
    "signalstats,metadata=mode=print:file=-",
    "-f",
    "null",
    "-",
  ]);

  const output = `${stdout}\n${stderr}`;
  const yavgMatches = output.match(/lavfi\.signalstats\.YAVG=([\d.]+)/g);
  if (!yavgMatches?.length) return 0;

  const sum = yavgMatches.reduce((acc, line) => {
    const val = parseFloat(line.split("=")[1]);
    return acc + val;
  }, 0);

  // YAVG is 0–255; normalize to 0–1
  return sum / yavgMatches.length / 255;
}
