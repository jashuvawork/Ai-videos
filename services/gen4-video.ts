import { randomUUID } from "crypto";
import { env } from "@/config/env";
import {
  clampRunwayDuration,
  downloadRunwayOutput,
  getRunwayApiKey,
  getRunwayTask,
  isRunwayConfigured,
  mapRunwayRatio,
  mapRunwayTaskProgress,
  runwayRequest,
  uploadEphemeralBuffer,
  uploadEphemeralFile,
} from "@/providers/runway/client";
import { findReadableLocalPath } from "@/storage/paths";
import { storage } from "@/storage";
import { createGen4Task, getGen4Task } from "@/lib/gen4-task-store";
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
  provider: string;
  model?: string;
  outputUrl?: string;
  videoUrl?: string;
  failure?: string;
}

function buildMotionPrompt(prompt: string): string {
  return [
    prompt,
    "Natural documentary camera movement, visible real-world motion.",
    "Photorealistic, cinematic, continuous motion, no frozen frames.",
  ]
    .join(" ")
    .slice(0, 1000);
}

function useRunwayApi(): boolean {
  return env.AI_VIDEO_PROVIDER === "runway" && isRunwayConfigured();
}

export class Gen4VideoService {
  async createTask(options: Gen4CreateOptions): Promise<{ taskId: string; provider: string; model: string }> {
    if (useRunwayApi()) {
      return this.createRunwayTask(options);
    }
    return this.createBuiltinTask(options);
  }

  async getTaskStatus(taskId: string): Promise<Gen4TaskStatus> {
    const local = await getGen4Task(taskId);
    if (local) {
      return {
        taskId: local.id,
        status: local.status,
        progress: local.progress,
        provider: local.provider,
        model: local.model,
        videoUrl: local.videoUrl,
        failure: local.failure,
      };
    }

    if (useRunwayApi()) {
      return this.getRunwayTaskStatus(taskId);
    }

    throw new ProviderError("Gen-4 task not found", "NOT_FOUND", false);
  }

  private async createBuiltinTask(options: Gen4CreateOptions): Promise<{
    taskId: string;
    provider: string;
    model: string;
  }> {
    const taskId = randomUUID();
    const duration = Math.max(2, Math.min(options.duration, 10));
    const model = options.imageBuffer ? "studio_gen4_turbo" : "studio_gen4";

    let referenceImagePath: string | undefined;
    if (options.imageBuffer) {
      const { saveGen4ReferenceImage } = await import("@/jobs/gen4-video-job");
      referenceImagePath = await saveGen4ReferenceImage(
        taskId,
        options.imageBuffer,
        options.imageFilename || "reference.png",
      );
    }

    await createGen4Task({
      id: taskId,
      status: "PENDING",
      progress: 0,
      prompt: options.prompt,
      width: options.width,
      height: options.height,
      duration,
      provider: "studio",
      model,
    });

    const { getJobQueue } = await import("@/jobs/queue");
    const { initializeWorker } = await import("@/workers/worker");

    initializeWorker();
    await getJobQueue().enqueue({
      id: taskId,
      type: "GEN4_VIDEO",
      projectId: "gen4",
      data: {
        taskId,
        prompt: options.prompt,
        width: options.width,
        height: options.height,
        duration,
        referenceImagePath,
      },
    });

    return { taskId, provider: "studio", model };
  }

  private async createRunwayTask(options: Gen4CreateOptions): Promise<{
    taskId: string;
    provider: string;
    model: string;
  }> {
    const apiKey = getRunwayApiKey()!;
    const ratio = mapRunwayRatio(options.width, options.height);
    const duration = clampRunwayDuration(options.duration);
    const promptText = buildMotionPrompt(options.prompt);

    let promptImage: string | undefined;
    if (options.imageLocalPath) {
      const readable = await findReadableLocalPath(options.imageLocalPath, [options.imageLocalPath]);
      if (readable) promptImage = await uploadEphemeralFile(apiKey, readable);
    } else if (options.imageBuffer) {
      promptImage = await uploadEphemeralBuffer(
        apiKey,
        options.imageBuffer,
        options.imageFilename || "reference.png",
      );
    }

    let task;
    let model: string;
    if (promptImage) {
      model = "gen4_turbo";
      task = await runwayRequest(apiKey, "/v1/image_to_video", {
        model: "gen4_turbo",
        promptImage,
        promptText,
        ratio,
        duration,
      });
    } else {
      model = "gen4.5";
      task = await runwayRequest(apiKey, "/v1/text_to_video", {
        model: "gen4.5",
        promptText,
        ratio,
        duration,
      });
    }

    return { taskId: task.id, provider: "runway", model };
  }

  private async getRunwayTaskStatus(taskId: string): Promise<Gen4TaskStatus> {
    const apiKey = getRunwayApiKey()!;
    const task = await getRunwayTask(apiKey, taskId);
    const progress = mapRunwayTaskProgress(task.status);

    let videoUrl: string | undefined;
    if (task.status === "SUCCEEDED") {
      videoUrl = await this.cacheRunwayOutput(taskId, task.output?.[0]);
    }

    return {
      taskId,
      status: task.status,
      progress,
      provider: "runway",
      outputUrl: task.output?.[0],
      videoUrl,
      failure: task.failure,
    };
  }

  private async cacheRunwayOutput(taskId: string, outputUrl?: string): Promise<string | undefined> {
    if (!outputUrl) return undefined;

    const assetPath = `gen4/${taskId}.mp4`;
    const existing = await findReadableLocalPath(assetPath);
    if (existing) return `/api/files/${assetPath}`;

    const apiKey = getRunwayApiKey()!;
    const buffer = await downloadRunwayOutput(outputUrl);
    const stored = await storage.upload(buffer, assetPath, "video/mp4");
    return stored.url ?? `/api/files/${assetPath}`;
  }
}
