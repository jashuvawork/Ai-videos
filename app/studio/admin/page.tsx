"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  projectId: string;
  projectTitle: string | null;
  projectKind: string;
  type: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  retryCount: number;
  createdAt: string;
}

export default function StudioAdminPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/studio/admin/jobs")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex gap-2 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading jobs...
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Debug / Jobs</h1>
        <p className="text-zinc-500 text-sm mt-1">Recent generation jobs — API keys are never shown.</p>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <Card key={job.id} className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-4 text-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-300 font-mono text-xs">{job.id.slice(0, 12)}…</span>
                <div className="flex gap-2">
                  <Badge variant={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "error" : "warning"}>
                    {job.status}
                  </Badge>
                  <Badge variant="outline">{job.step ?? "—"}</Badge>
                </div>
              </div>
              <p className="text-zinc-400">
                {job.projectTitle || job.projectId} · {job.projectKind} · {job.progress}%
              </p>
              {job.error && <p className="text-red-400 text-xs">{job.error}</p>}
              <p className="text-zinc-600 text-xs">
                Retries: {job.retryCount} · {new Date(job.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
