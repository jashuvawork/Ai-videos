import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { env } from "@/config/env";
import { BITRATE_PRESETS } from "@/config/video";
import { buildMotionFilterChain } from "@/providers/studio/motion-engine";
import { storage } from "@/storage";
import { videoLog } from "@/lib/logger";
import {
  FILM_LOOK_FILTER,
  buildXfadeFilter,
  sceneStartTimes,
  totalTimelineDuration,
} from "@/lib/cinematic";
import { padVideoToDuration, probeVideoDuration } from "@/lib/ffmpeg-media";
import type { SubtitleEntry } from "./subtitle";

const execFileAsync = promisify(execFile);

export interface RenderSceneInput {
  sceneId: string;
  sceneNumber: number;
  duration: number;
  imagePath?: string;
  videoPath?: string;
  voicePath?: string;
  cameraMovement?: string;
  transition?: string;
}

export interface RenderInput {
  projectId: string;
  version: number;
  width: number;
  height: number;
  fps: number;
  scenes: RenderSceneInput[];
  musicPath?: string;
  subtitles?: SubtitleEntry[];
  /** Always off for social story exports unless explicitly requested. */
  burnSubtitles?: boolean;
  subtitleStyle?: string;
}

const CAMERA_MOVEMENTS: Record<string, string> = {
  "slow zoom in": "slow zoom in",
  "slow zoom out": "slow zoom out",
  "slow pan left": "slow pan left",
  "slow pan right": "slow pan right",
  "push in": "push in",
  "pull out": "pull out",
  "vertical pan": "vertical pan",
};

export class VideoRenderService {
  private workDir: string;

  constructor() {
    this.workDir = join(process.cwd(), "renders");
  }

  async render(input: RenderInput): Promise<{ videoPath: string; thumbnailPath: string; duration: number; fileSize: number }> {
    const projectDir = join(this.workDir, input.projectId, `v${input.version}`);
    await mkdir(projectDir, { recursive: true });

    videoLog("Starting cinematic story render", { projectId: input.projectId, operation: "RENDER_VIDEO" });

    const sceneClips: string[] = [];
    const durations = input.scenes.map((s) => Math.max(0.4, s.duration));

    for (const scene of input.scenes) {
      const rawPath = join(projectDir, `scene_${scene.sceneNumber}_raw.mp4`);
      const clipPath = join(projectDir, `scene_${scene.sceneNumber}.mp4`);

      if (scene.videoPath) {
        await this.normalizeVideo(scene.videoPath, rawPath, input.width, input.height, scene.duration, input.fps);
      } else if (scene.imagePath) {
        await this.imageToVideo(scene.imagePath, rawPath, input.width, input.height, scene.duration, input.fps, scene.cameraMovement);
      } else {
        await this.createColorClip(rawPath, input.width, input.height, scene.duration, input.fps, scene.sceneNumber);
      }

      await padVideoToDuration(rawPath, clipPath, scene.duration, input.fps, input.width, input.height);
      await unlink(rawPath).catch(() => {});
      sceneClips.push(clipPath);
    }

    const videoOnlyPath = join(projectDir, "video_only.mp4");
    await this.assembleStoryPicture(sceneClips, durations, videoOnlyPath, input.fps);

    const audioMixedPath = join(projectDir, "audio_mixed.mp3");
    const storyDuration = totalTimelineDuration(durations);
    await this.mixStoryAudio(input.scenes, durations, input.musicPath, audioMixedPath, storyDuration);

    const finalPath = join(projectDir, "final.mp4");
    const bitrate = BITRATE_PRESETS[env.RENDER_QUALITY] ?? BITRATE_PRESETS.high;

    const burn = input.burnSubtitles === true && input.subtitles && input.subtitles.length > 0;
    if (burn) {
      const srtPath = join(projectDir, "subs.srt");
      await this.writeSrt(srtPath, input.subtitles!);
      const srtEscaped = srtPath.replace(/'/g, "'\\''");
      await execFileAsync("ffmpeg", [
        "-y", "-i", videoOnlyPath, "-i", audioMixedPath,
        "-vf", `subtitles='${srtEscaped}':force_style='FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=60'`,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-b:v", bitrate,
        "-c:a", "aac", "-b:a", "192k",
        "-t", String(storyDuration),
        finalPath,
      ]);
    } else {
      await execFileAsync("ffmpeg", [
        "-y", "-i", videoOnlyPath, "-i", audioMixedPath,
        "-filter_complex", `[0:v]tpad=stop_mode=clone:stop_duration=30,${FILM_LOOK_FILTER}[v]`,
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-b:v", bitrate, "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", String(storyDuration),
        finalPath,
      ]);
    }

    const thumbnailPath = join(projectDir, "thumbnail.jpg");
    await execFileAsync("ffmpeg", [
      "-y", "-i", finalPath, "-ss", "1", "-frames:v", "1", "-q:v", "2", thumbnailPath,
    ]);

    const videoBuffer = await readFile(finalPath);
    const thumbBuffer = await readFile(thumbnailPath);

    const storedVideo = await storage.upload(
      videoBuffer,
      `projects/${input.projectId}/renders/v${input.version}/final.mp4`,
      "video/mp4",
    );
    const storedThumb = await storage.upload(
      thumbBuffer,
      `projects/${input.projectId}/renders/v${input.version}/thumbnail.jpg`,
      "image/jpeg",
    );

    await this.cleanup(projectDir, [videoOnlyPath, audioMixedPath, ...sceneClips]);

    return {
      videoPath: storedVideo.localPath,
      thumbnailPath: storedThumb.localPath,
      duration: storyDuration,
      fileSize: storedVideo.fileSize,
    };
  }

  private async assembleStoryPicture(
    sceneClips: string[],
    durations: number[],
    outputPath: string,
    fps: number,
  ) {
    const expected = totalTimelineDuration(durations);
    if (sceneClips.length === 1) {
      await execFileAsync("ffmpeg", [
        "-y", "-i", sceneClips[0],
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps),
        "-t", String(expected),
        outputPath,
      ]);
      return;
    }

    try {
      const args = ["-y"];
      for (const clip of sceneClips) args.push("-i", clip);
      args.push(
        "-filter_complex", buildXfadeFilter(sceneClips.length, durations),
        "-map", "[v]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps),
        "-t", String(expected),
        outputPath,
      );
      await execFileAsync("ffmpeg", args);
      const actual = await probeVideoDuration(outputPath);
      if (actual < expected * 0.8) {
        throw new Error(`xfade output too short (${actual.toFixed(2)}s < ${expected}s)`);
      }
    } catch {
      const concatPath = outputPath.replace(/\.mp4$/, ".concat.txt");
      await writeFile(concatPath, sceneClips.map((p) => `file '${p}'`).join("\n"));
      await execFileAsync("ffmpeg", [
        "-y", "-f", "concat", "-safe", "0", "-i", concatPath,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps),
        outputPath,
      ]);
      await unlink(concatPath).catch(() => {});
    }
  }

  private async imageToVideo(
    imagePath: string,
    outputPath: string,
    width: number,
    height: number,
    duration: number,
    fps: number,
    cameraMovement?: string,
  ) {
    const movementKey = cameraMovement || "slow zoom in";
    const normalizedMovement = CAMERA_MOVEMENTS[movementKey] || movementKey;
    const totalFrames = Math.ceil(duration * fps);
    const vf = buildMotionFilterChain(width, height, totalFrames, normalizedMovement, fps);

    await execFileAsync("ffmpeg", [
      "-y", "-loop", "1", "-i", imagePath,
      "-vf", vf,
      "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-t", String(duration), "-r", String(fps),
      outputPath,
    ]);
  }

  private async normalizeVideo(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number,
    duration: number,
    fps: number,
  ) {
    await execFileAsync("ffmpeg", [
      "-y", "-i", inputPath,
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-t", String(duration), "-r", String(fps),
      "-an", outputPath,
    ]);
  }

  private async createColorClip(
    outputPath: string,
    width: number,
    height: number,
    duration: number,
    fps: number,
    sceneNumber: number,
  ) {
    const hue = (sceneNumber * 40) % 360;
    await execFileAsync("ffmpeg", [
      "-y", "-f", "lavfi",
      "-i", "color=c=0x" + hue.toString(16).padStart(2, "0") + "4040:s=" + width + "x" + height + ":d=" + duration,
      "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-t", String(duration), "-r", String(fps),
      outputPath,
    ]);
  }

  private async mixStoryAudio(
    scenes: RenderSceneInput[],
    durations: number[],
    musicPath: string | undefined,
    outputPath: string,
    totalDuration: number,
  ) {
    const starts = sceneStartTimes(durations);
    const voiceTracks = scenes
      .map((scene, i) => (scene.voicePath ? { path: scene.voicePath, start: starts[i] ?? 0 } : null))
      .filter((t): t is { path: string; start: number } => Boolean(t));

    if (voiceTracks.length === 0 && !musicPath) {
      await execFileAsync("ffmpeg", [
        "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", String(totalDuration), "-c:a", "libmp3lame", outputPath,
      ]);
      return;
    }

    const args = ["-y"];
    const filters: string[] = [];
    let inputIndex = 0;

    const delayed: string[] = [];
    for (const track of voiceTracks) {
      args.push("-i", track.path);
      const idx = inputIndex++;
      const ms = Math.max(0, Math.round(track.start * 1000));
      filters.push(`[${idx}:a]adelay=${ms}|${ms},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[v${idx}]`);
      delayed.push(`[v${idx}]`);
    }

    let voiceLabel: string | null = null;
    if (delayed.length === 1) {
      filters.push(`${delayed[0]}volume=1.15[voice]`);
      voiceLabel = "voice";
    } else if (delayed.length > 1) {
      filters.push(
        `${delayed.join("")}amix=inputs=${delayed.length}:duration=longest:dropout_transition=0:normalize=0,volume=1.15[voice]`,
      );
      voiceLabel = "voice";
    }

    if (musicPath) {
      args.push("-stream_loop", "-1", "-i", musicPath);
      const musicIdx = inputIndex++;
      filters.push(
        `[${musicIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,atrim=0:${totalDuration},asetpts=PTS-STARTPTS,volume=0.12[music]`,
      );
      if (voiceLabel) {
        filters.push(
          `[${voiceLabel}][music]sidechaincompress=threshold=0.04:ratio=7:attack=40:release=320:makeup=2[out]`,
        );
      } else {
        filters.push("[music]volume=0.22[out]");
      }
    } else if (voiceLabel) {
      filters.push(`[${voiceLabel}]anull[out]`);
    }

    args.push("-filter_complex", filters.join(";"));
    args.push("-map", "[out]", "-t", String(totalDuration), "-c:a", "libmp3lame", "-b:a", "192k", outputPath);
    await execFileAsync("ffmpeg", args);
  }

  private async writeSrt(path: string, subtitles: SubtitleEntry[]) {
    const content = subtitles
      .map((s, i) => {
        const start = formatSrt(s.startTime);
        const end = formatSrt(s.endTime);
        return String(i + 1) + "\n" + start + " --> " + end + "\n" + s.text + "\n";
      })
      .join("\n");
    await writeFile(path, content);
  }

  private async cleanup(dir: string, files: string[]) {
    for (const f of files) {
      await unlink(f).catch(() => {});
    }
  }
}

function formatSrt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, "0");
}
