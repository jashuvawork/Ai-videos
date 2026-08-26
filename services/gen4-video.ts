import { findReadableLocalPath } from "@/storage/paths";
import { storage } from "@/storage";
import {
  clampRunwayDuration,
  downloadRunwayOutput,
  getRunwayApiKey,
  getRunwayTask,
  mapRunwayRatio,
  mapRunwayTaskProgress,
  runwayRequest,
  uploadEphemeralBuffer,
  uploadEphemeralFile,
} from "@/providers/runway/client";
import { ProviderError } from "@/providers/shared/errors";

export interface Gen4CreateOptions {
  prompt: string;
  width: number;
  height: number;
  duration: number;
  imageBuffer?: Buffer;
  imageFilename?: string;
  imageLocalPath?: string;
}

export interface Gen4TaskStatus {
  taskId: string;
  status: string;
  progress: number;
  outputUrl?: string;
  videoUrl?: string;
  failure?: string;
}

function buildMotionPrompt(prompt: string, cameraMovement?: string): string {
  const motionHint = cameraMovement
    ? `Camera: ${cameraMovement}.`
    : "Natural documentary camera movement, visible real-world motion.";
  return [
    prompt,
    motionHint,
    "Photorealistic, cinematic, continuous motion, no frozen frames, industrial realism when applicable.",
  ]
    .join(" ")
    .slice(0, 1000);
}

export class Gen4VideoService {
  private getApiKey(): string {
    const apiKey = getRunwayApiKey();
    if (!apiKey) throw new ProviderError("Runway API key not configured", "AUTH_ERROR", false);
    return apiKey;
  }

  async resolvePromptImage(
    apiKey: string,
    options: {
      imageBuffer?: Buffer;
      imageFilename?: string;
      imageLocalPath?: string;
    },
  ): Promise<string | undefined> {
    if (options.imageLocalPath) {
      const readable = await findReadableLocalPath(options.imageLocalPath, [options.imageLocalPath]);
      if (readable) return uploadEphemeralFile(apiKey, readable);
    }

    if (options.imageBuffer) {
      const filename = options.imageFilename || "reference.png";
      return uploadEphemeralBuffer(apiKey, options.imageBuffer, filename);
    }

    return undefined;
  }

  async createTask(options: Gen4CreateOptions): Promise<{ taskId: string }> {
    const apiKey = this.getApiKey();
    const ratio = mapRunwayRatio(options.width, options.height);
    const duration = clampRunwayDuration(options.duration);
    const promptText = buildMotionPrompt(options.prompt);

    const promptImage = await this.resolvePromptImage(apiKey, {
      imageBuffer: options.imageBuffer,
      imageFilename: options.imageFilename,
      imageLocalPath: options.imageLocalPath,
    });

    let task;
    if (promptImage) {
      task = await runwayRequest(apiKey, "/v1/image_to_video", {
        model: "gen4_turbo",
        promptImage,
        promptText,
        ratio,
        duration,
      });
    } else {
      task = await runwayRequest(apiKey, "/v1/text_to_video", {
        model: "gen4.5",
        promptText,
        ratio,
        duration,
      });
    }

    return { taskId: task.id };
  }

  async getTaskStatus(taskId: string): Promise<Gen4TaskStatus> {
    const apiKey = this.getApiKey();
    const task = await getRunwayTask(apiKey, taskId);
    const progress = mapRunwayTaskProgress(task.status);

    let videoUrl: string | undefined;
    if (task.status === "SUCCEEDED") {
      videoUrl = await this.cacheOutputIfNeeded(taskId, task.output?.[0]);
    }

    return {
      taskId,
      status: task.status,
      progress,
      outputUrl: task.output?.[0],
      videoUrl,
      failure: task.failure,
    };
  }

  async cacheOutputIfNeeded(taskId: string, outputUrl?: string): Promise<string | undefined> {
    if (!outputUrl) return undefined;

    const assetPath = `gen4/${taskId}.mp4`;
    const existing = await findReadableLocalPath(assetPath);
    if (existing) {
      return `/api/files/${assetPath}`;
    }

    const apiKey = this.getApiKey();
    const buffer = await downloadRunwayOutput(outputUrl);
    const stored = await storage.upload(buffer, assetPath, "video/mp4");
    return stored.url ?? `/api/files/${assetPath}`;
  }
}
