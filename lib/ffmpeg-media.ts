import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function probeVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=duration",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    filePath,
  ]);
  const probe = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{ duration?: string }>;
  };
  const streamDuration = parseFloat(probe.streams?.[0]?.duration || "0");
  const formatDuration = parseFloat(probe.format?.duration || "0");
  return streamDuration > 0.05 ? streamDuration : formatDuration;
}

/**
 * Force a clip to an exact length so xfade offsets stay valid.
 * Short clips loop; tiny gaps clone the last frame.
 */
export async function padVideoToDuration(
  inputPath: string,
  outputPath: string,
  duration: number,
  fps: number,
  width: number,
  height: number,
): Promise<void> {
  const target = Math.max(0.2, duration);
  let actual = 0;
  try {
    actual = await probeVideoDuration(inputPath);
  } catch {
    actual = 0;
  }

  const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps}`;

  if (actual >= target - 0.04) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      vf,
      "-t",
      String(target),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      outputPath,
    ]);
    return;
  }

  if (actual >= target * 0.85 && actual > 0.2) {
    const pad = Number((target - actual).toFixed(3));
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `${vf},tpad=stop_mode=clone:stop_duration=${pad}`,
      "-t",
      String(target),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      outputPath,
    ]);
    return;
  }

  await execFileAsync("ffmpeg", [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    inputPath,
    "-vf",
    vf,
    "-t",
    String(target),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPath,
  ]);
}
