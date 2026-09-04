import { execFile } from "child_process";
import { promisify } from "util";
import { access, readFile } from "fs/promises";

const execFileAsync = promisify(execFile);

export type VideoQAResult = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  blackFrameRatio?: number;
  frozenFrameRatio?: number;
  meanLuma?: number;
};

/** Fail job only when output is clearly broken — not for dark cinematic grades */
const MIN_FILE_BYTES = 10000;
const MIN_FREEZE_RATIO_FAIL = 0.75;

/**
 * Post-render validation — catches corrupt files and fully stuck frames, not dark documentary footage.
 */
export class VideoQAService {
  async analyze(filePath: string): Promise<VideoQAResult> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      await access(filePath);
    } catch {
      return { valid: false, issues: ["Output file does not exist"], warnings: [], hasAudio: false };
    }

    const buffer = await readFile(filePath);
    if (buffer.length < MIN_FILE_BYTES) {
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
    let frozenFrameRatio = 0;
    let meanLuma: number | undefined;

    try {
      const { stderr } = await execFileAsync("ffmpeg", [
        "-i",
        filePath,
        "-vf",
        "blackdetect=d=0.75:pixel_black_th=0.02:picture_black_ratio_th=0.98",
        "-f",
        "null",
        "-",
      ]);
      blackFrameRatio = computeSegmentCoverage(stderr, duration, /black_start:([\d.]+)\s+black_end:([\d.]+)/g);
      if (blackFrameRatio > 0.5) {
        warnings.push(
          `Dark segments detected (${(blackFrameRatio * 100).toFixed(0)}% of runtime) — expected for low-key footage`,
        );
      }
    } catch {
      // optional
    }

    try {
      const { stderr } = await execFileAsync("ffmpeg", [
        "-i",
        filePath,
        "-vf",
        "freezedetect=n=0.002:d=1.2",
        "-f",
        "null",
        "-",
      ]);
      frozenFrameRatio = computeFreezeCoverage(stderr, duration);
      if (frozenFrameRatio > 0.35) {
        warnings.push(
          `Low motion segments (${(frozenFrameRatio * 100).toFixed(0)}% of runtime) — scene clips may look static`,
        );
      }
      if (frozenFrameRatio > MIN_FREEZE_RATIO_FAIL) {
        issues.push(
          `Video appears mostly frozen (${(frozenFrameRatio * 100).toFixed(0)}% stuck frames) — regenerate with AI_VIDEO motion clips`,
        );
      }
    } catch {
      // optional
    }

    try {
      meanLuma = await probeMeanLuma(filePath);
    } catch {
      // optional
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      duration,
      width,
      height,
      fps,
      hasAudio,
      blackFrameRatio,
      frozenFrameRatio,
      meanLuma,
    };
  }
}

function computeSegmentCoverage(stderr: string, duration: number, pattern: RegExp): number {
  if (duration <= 0) return 0;

  const segments: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(stderr)) !== null) {
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

function computeFreezeCoverage(stderr: string, duration: number): number {
  const fromSegments = computeSegmentCoverage(
    stderr,
    duration,
    /freeze_start:([\d.]+)\s+freeze_end:([\d.]+)/g,
  );
  if (fromSegments > 0) return fromSegments;

  // freezedetect often reports freeze_start:0 without freeze_end until EOF
  if (/freeze_start:\s*0/.test(stderr) && duration >= 2) {
    const endMatch = stderr.match(/freeze_end:([\d.]+)/);
    if (endMatch) {
      return Math.min(1, parseFloat(endMatch[1]) / duration);
    }
    return 0.95;
  }

  return 0;
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

  return sum / yavgMatches.length / 255;
}
