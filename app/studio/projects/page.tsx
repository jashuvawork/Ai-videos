"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";

interface Project {
  id: string;
  title: string | null;
  idea: string;
  studioStatus: string | null;
  duration: number;
  qualityScore: number | null;
  createdAt: string;
}

export default function StudioProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchJson<{ projects?: Project[] }>("/api/studio/projects")
      .then(({ data }) => setProjects(data.projects || []))
      .catch(() => setProjects([]));
  }, []);

  return (
    <div className="p-6 sm:p-10 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">All Projects</h1>
      <div className="space-y-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/studio/projects/${p.id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 hover:border-zinc-700"
          >
            <div>
              <p className="font-medium text-zinc-200">{p.title || p.idea.slice(0, 60)}</p>
              <p className="text-xs text-zinc-500">
                {formatDuration(p.duration)} · {p.studioStatus ?? "DRAFT"}
              </p>
            </div>
            {p.qualityScore != null && (
              <Badge variant="success">{p.qualityScore.toFixed(1)}</Badge>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
