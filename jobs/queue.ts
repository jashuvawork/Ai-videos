import type { JobStep, JobStatus } from "@/lib/generated/prisma/client";

export interface QueueJob {
  id: string;
  type: string;
  projectId: string;
  sceneId?: string;
  data?: Record<string, unknown>;
}

export interface JobQueue {
  enqueue(job: QueueJob): Promise<void>;
  process(handler: (job: QueueJob) => Promise<void>): void;
  getQueueSize(): number;
}

class InMemoryQueue implements JobQueue {
  private queue: QueueJob[] = [];
  private processing = false;
  private handler?: (job: QueueJob) => Promise<void>;

  async enqueue(job: QueueJob): Promise<void> {
    this.queue.push(job);
    this.tick();
  }

  process(handler: (job: QueueJob) => Promise<void>): void {
    this.handler = handler;
    this.tick();
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  private async tick() {
    if (this.processing || !this.handler || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      try {
        await this.handler(job);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
      }
    }

    this.processing = false;
  }
}

let queueInstance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!queueInstance) {
    queueInstance = new InMemoryQueue();
  }
  return queueInstance;
}

export const JOB_STEP_ORDER: JobStep[] = [
  "CREATE_SCRIPT",
  "CREATE_CHARACTER_BIBLE",
  "CREATE_SCENES",
  "GENERATE_VISUALS",
  "GENERATE_VOICE",
  "GENERATE_MUSIC",
  "GENERATE_SFX",
  "GENERATE_SUBTITLES",
  "BUILD_TIMELINE",
  "RENDER_VIDEO",
  "GENERATE_THUMBNAIL",
  "GENERATE_METADATA",
  "COMPLETE",
];

export function stepProgress(step: JobStep): number {
  const index = JOB_STEP_ORDER.indexOf(step);
  if (index < 0) return 0;
  return Math.round((index / (JOB_STEP_ORDER.length - 1)) * 100);
}
