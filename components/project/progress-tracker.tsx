"use client";

import { useEffect, useState } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { STEP_LABELS } from "@/config/video";
import { fetchJson } from "@/lib/api-client";

const STEPS = [
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

interface ProgressTrackerProps {
  jobId: string;
  onComplete?: () => void;
}

export function ProgressTracker({ jobId, onComplete }: ProgressTrackerProps) {
  const [job, setJob] = useState<{
    step?: string;
    progress: number;
    status: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const { data } = await fetchJson<{ job: {
          step?: string;
          progress: number;
          status: string;
          error?: string;
        } }>(`/api/jobs/${jobId}`);
        setJob(data.job);

        if (data.job.status === "COMPLETED") {
          clearInterval(interval);
          onComplete?.();
        }
        if (data.job.status === "FAILED") {
          clearInterval(interval);
        }
      } catch {
        // retry on next poll
      }
    };

    poll();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Starting generation...</span>
      </div>
    );
  }

  const currentStepIndex = STEPS.indexOf(job.step || "");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-300">Generation Progress</span>
          <span className="text-violet-400 tabular-nums">{job.progress}%</span>
        </div>
        <Progress value={job.progress} />
      </div>

      <div className="space-y-2">
        {STEPS.slice(0, -1).map((step, index) => {
          const isComplete = index < currentStepIndex || job.status === "COMPLETED";
          const isCurrent = step === job.step && job.status === "RUNNING";
          const isFailed = job.status === "FAILED" && step === job.step;

          return (
            <div key={step} className="flex items-center gap-3 text-sm">
              {isComplete ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 text-violet-400 animate-spin shrink-0" />
              ) : isFailed ? (
                <Circle className="h-4 w-4 text-red-400 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-600 shrink-0" />
              )}
              <span
                className={
                  isComplete
                    ? "text-zinc-300"
                    : isCurrent
                      ? "text-violet-300"
                      : isFailed
                        ? "text-red-400"
                        : "text-zinc-600"
                }
              >
                {STEP_LABELS[step] || step}
              </span>
            </div>
          );
        })}
      </div>

      {job.error && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-300">
          {job.error}
        </div>
      )}
    </div>
  );
}
