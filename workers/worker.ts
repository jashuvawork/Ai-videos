import { getJobQueue } from "@/jobs/queue";
import { VideoGenerationProcessor } from "@/jobs/video-generation-job";

let initialized = false;

export function initializeWorker() {
  if (initialized) return;

  // On Vercel/serverless, jobs are processed by the Railway poll worker
  if (process.env.DISABLE_INLINE_WORKER === "true" || process.env.DISABLE_INLINE_WORKER === "1") {
    return;
  }

  initialized = true;

  const queue = getJobQueue();
  const processor = new VideoGenerationProcessor();

  queue.process(async (job) => {
    await processor.process(job.id, job.projectId, job.sceneId);
  });
}

// Auto-initialize in local/dev server (not on Vercel)
if (
  typeof window === "undefined" &&
  process.env.DISABLE_INLINE_WORKER !== "true" &&
  process.env.DISABLE_INLINE_WORKER !== "1"
) {
  initializeWorker();
}
