/**
 * Railway worker: polls PostgreSQL for pending generation jobs and processes them.
 * Run with: npm run worker:poll
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { VideoGenerationProcessor } from "@/jobs/video-generation-job";
import { videoLog } from "@/lib/logger";

const POLL_INTERVAL_MS = 3000;
const processor = new VideoGenerationProcessor();

async function poll() {
  const job = await prisma.generationJob.findFirst({
    where: { status: { in: ["PENDING", "RETRYING"] } },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return;

  videoLog("Processing job from poll worker", {
    jobId: job.id,
    projectId: job.projectId,
    operation: "WORKER_POLL",
  });

  try {
    await processor.process(job.id, job.projectId, job.sceneId ?? undefined);
  } catch (error) {
    videoLog(
      "Poll worker job error",
      { jobId: job.id, error: String(error) },
      "error",
    );
  }
}

async function main() {
  console.log("[WORKER] AI Video Studio poll worker started");
  console.log("[WORKER] Polling for PENDING/RETRYING jobs every", POLL_INTERVAL_MS, "ms");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await poll();
    } catch (error) {
      console.error("[WORKER] Poll error:", error);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("[WORKER] Fatal:", err);
  process.exit(1);
});
