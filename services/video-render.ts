import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { env } from "@/config/env";
import { BITRATE_PRESETS } from "@/config/video";
import { buildMotionFilterChain } from "@/providers/studio/motion-engine";
import { storage } from "@/storage";
import { prisma } from "@/lib/db";
import { videoLog } from "@/lib/logger";
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

    videoLog("Starting render", { projectId: input.projectId, operation: "RENDER_VIDEO" });

    const sceneClips: string[] = [];
    const voiceClips: string[] = [];

    for (const scene of input.scenes) {
      const clipPath = join(projectDir, `scene_${scene.sceneNumber}.mp4`);

      if (scene.videoPath) {
        await this.normalizeVideo(scene.videoPath, clipPath, input.width, input.height, scene.duration, input.fps);
      } else if (scene.imagePath) {
        await this.imageToVideo(scene.imagePath, clipPath, input.width, input.height, scene.duration, input.fps, scene.cameraMovement);
      } else {
        await this.createColorClip(clipPath, input.width, input.height, scene.duration, input.fps, scene.sceneNumber);
      }

      sceneClips.push(clipPath);

      if (scene.voicePath) {
        voiceClips.push(scene.voicePath);
      }
    }

    const concatPath = join(projectDir, "concat.txt");
    const concatContent = sceneClips.map((p) => `file '${p}'`).join("\n");
    await writeFile(concatPath, concatContent);

    const videoOnlyPath = join(projectDir, "video_only.mp4");
    await execFileAsync("ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", concatPath,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(input.fps),
      videoOnlyPath,
    ]);

    let audioMixedPath = join(projectDir, "audio_mixed.mp3");
    await this.mixAudio(voiceClips, input.musicPath, audioMixedPath, input.scenes);

    let finalPath = join(projectDir, "final.mp4");

    if (input.burnSubtitles && input.subtitles && input.subtitles.length > 0) {
      const srtPath = join(projectDir, "subs.srt");
      await this.writeSrt(srtPath, input.subtitles);
      const srtEscaped = srtPath.replace(/'/g, "'\\''");
      await execFileAsync("ffmpeg", [
        "-y", "-i", videoOnlyPath, "-i", audioMixedPath,
        "-vf", `subtitles='${srtEscaped}':force_style='FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=60'`,
        "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k",
        "-shortest", finalPath,
      ]);
    } else {
      await execFileAsync("ffmpeg", [
        "-y", "-i", videoOnlyPath, "-i", audioMixedPath,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", finalPath,
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

    const duration = input.scenes.reduce((sum, s) => sum + s.duration, 0);

    await this.cleanup(projectDir, [concatPath, videoOnlyPath, audioMixedPath, ...sceneClips]);

    return {
      videoPath: storedVideo.localPath,
      thumbnailPath: storedThumb.localPath,
      duration,
      fileSize: storedVideo.fileSize,
    };
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
    const vf = buildMotionFilterChain(width, height, totalFrames, normalizedMovement);

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

  private async mixAudio(
    voicePaths: string[],
    musicPath: string | undefined,
    outputPath: string,
    scenes: RenderSceneInput[],
  ) {
    const args = ["-y"];
    const filters: string[] = [];
    let inputIndex = 0;

    const voiceInputs: number[] = [];
    for (const voicePath of voicePaths) {
      args.push("-i", voicePath);
      voiceInputs.push(inputIndex++);
    }

    if (musicPath) {
      args.push("-i", musicPath);
      const musicIdx = inputIndex++;

      if (voiceInputs.length > 0) {
        const voiceMix = voiceInputs.map((i) => "[" + i + ":a]").join("");
        filters.push(
          voiceMix + "amix=inputs=" + voiceInputs.length + ":duration=longest:dropout_transition=2[voice]",
        );
        filters.push("[voice]volume=1.0[voicev]");
        filters.push("[" + musicIdx + ":a]volume=0.2[musicv]");
        filters.push("[voicev][musicv]amix=inputs=2:duration=longest:dropout_transition=2[out]");
      } else {
        filters.push("[" + musicIdx + ":a]volume=0.3[out]");
      }
    } else if (voiceInputs.length > 0) {
      const voiceMix = voiceInputs.map((i) => "[" + i + ":a]").join("");
      filters.push(
        voiceMix + "amix=inputs=" + voiceInputs.length + ":duration=longest:dropout_transition=2[out]",
      );
    } else {
      const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0);
      await execFileAsync("ffmpeg", [
        "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", String(totalDuration), "-c:a", "libmp3lame", outputPath,
      ]);
      return;
    }

    args.push("-filter_complex", filters.join(";"));
    args.push("-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k", outputPath);
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
