import { getJobQueue } from "@/jobs/queue";
import { VideoGenerationProcessor } from "@/jobs/video-generation-job";

let initialized = false;

export function initializeWorker() {
  if (initialized) return;
  initialized = true;

  const queue = getJobQueue();
  const processor = new VideoGenerationProcessor();

  queue.process(async (job) => {
    await processor.process(job.id, job.projectId, job.sceneId);
  });
}

// Auto-initialize in server context
if (typeof window === "undefined") {
  initializeWorker();
}
