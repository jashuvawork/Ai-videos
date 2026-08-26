import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { storage } from "@/storage";
import { getStorageBasePath } from "@/storage/paths";
import { updateGen4Task } from "@/lib/gen4-task-store";
import { BuiltinGen4Generator } from "@/services/builtin-gen4-generator";
import { videoLog } from "@/lib/logger";

export interface Gen4JobPayload {
  taskId: string;
  prompt: string;
  width: number;
  height: number;
  duration: number;
  referenceImagePath?: string;
}

export class Gen4VideoProcessor {
  async process(payload: Gen4JobPayload) {
    const { taskId, prompt, width, height, duration } = payload;

    try {
      await updateGen4Task(taskId, { status: "RUNNING", progress: 5 });

      let imageBuffer: Buffer | undefined;
      if (payload.referenceImagePath) {
        const { readFile } = await import("fs/promises");
        imageBuffer = await readFile(payload.referenceImagePath);
      }

      const generator = new BuiltinGen4Generator();
      const videoBuffer = await generator.generate({
        prompt,
        width,
        height,
        duration,
        imageBuffer,
        onProgress: async (progress) => {
          await updateGen4Task(taskId, { progress });
        },
      });

      const assetPath = `gen4/${taskId}.mp4`;
      const stored = await storage.upload(videoBuffer, assetPath, "video/mp4");

      await updateGen4Task(taskId, {
        status: "SUCCEEDED",
        progress: 100,
        videoUrl: stored.url ?? `/api/files/${assetPath}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gen-4 generation failed";
      videoLog("Gen4 job failed", { taskId, error: message }, "error");
      await updateGen4Task(taskId, { status: "FAILED", progress: 0, failure: message });
    }
  }
}

export async function saveGen4ReferenceImage(taskId: string, buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() || "png";
  const rel = `gen4/${taskId}/reference.${ext}`;
  const full = join(getStorageBasePath(), rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return full;
}
