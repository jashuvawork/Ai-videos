"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Clock, Trash2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";

interface Project {
  id: string;
  title: string | null;
  idea: string;
  status: string;
  duration: number;
  platform: string;
  thumbnailUrl: string | null;
  createdAt: string;
  estimatedCost: number;
}

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED": return "success" as const;
    case "FAILED": return "error" as const;
    case "GENERATING": case "RENDERING": return "warning" as const;
    default: return "outline" as const;
  }
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ projects?: Project[] }>("/api/projects")
      .then(({ data }) => setProjects(data.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await fetchJson(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Your Projects</h1>
          <p className="text-zinc-500 mt-1">Recent video projects</p>
        </div>
        <Link href="/">
          <Button>Create New Video</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-zinc-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <Film className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No projects yet</h3>
          <p className="text-zinc-500 mb-6">Create your first AI video to get started.</p>
          <Link href="/">
            <Button>Create Video</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="group overflow-hidden hover:border-zinc-700 transition-colors">
              <div className="aspect-video bg-zinc-900 relative">
                {project.thumbnailUrl ? (
                  <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="h-8 w-8 text-zinc-700" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-medium text-zinc-200 truncate">
                    {project.title || project.idea.slice(0, 50)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(project.duration)}
                    </span>
                    <span>{project.platform.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/projects/${project.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </Link>
                  {project.status === "COMPLETED" && (
                    <a href={`/api/projects/${project.id}/download`}>
                      <Button variant="outline" size="sm">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(project.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
