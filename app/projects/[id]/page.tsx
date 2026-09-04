"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/project/video-player";
import { ProgressTracker } from "@/components/project/progress-tracker";
import { SceneEditor } from "@/components/project/scene-editor";
import { fetchJson } from "@/lib/api-client";

interface ProjectData {
  id: string;
  title: string | null;
  idea: string;
  status: string;
  errorMessage?: string | null;
  hook: string | null;
  summary: string | null;
  duration: number;
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  estimatedCost: number;
  actualCost: number;
  version: number;
  scenes: Array<{
    id: string;
    sceneNumber: number;
    duration: number;
    narration?: string | null;
    visualDescription?: string | null;
    caption?: string | null;
    cameraMovement?: string | null;
    cameraAngle?: string | null;
    status: string;
  }>;
  socialMetadata?: {
    youtubeTitle?: string | null;
    youtubeDescription?: string | null;
    youtubeHashtags?: string | null;
    instagramCaption?: string | null;
    instagramHashtags?: string | null;
    tiktokCaption?: string | null;
    tiktokHashtags?: string | null;
  } | null;
}

function ProjectContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await fetchJson<{ project?: ProjectData }>(`/api/projects/${projectId}`);
      setProject(data.project ?? null);
    } catch {
      setProject(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const isGenerating = project?.status === "GENERATING" || project?.status === "RENDERING";

  if (loading) {
    return <div className="p-8 text-zinc-500">Loading project...</div>;
  }

  if (!project) {
    return <div className="p-8 text-red-400">Project not found</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {project.title || "Untitled Project"}
          </h1>
          {project.hook && (
            <p className="text-zinc-400 mt-1 text-sm">{project.hook}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={project.status === "COMPLETED" ? "success" : "warning"}>
            {project.status}
          </Badge>
          <span className="text-xs text-zinc-500">v{project.version}</span>
          <span className="text-xs text-zinc-500">
            Est. ${project.estimatedCost?.toFixed(2) || "0.00"}
          </span>
        </div>
      </div>

      {isGenerating && jobId ? (
        <Card className="p-6">
          <ProgressTracker jobId={jobId} onComplete={fetchProject} />
        </Card>
      ) : project.status === "FAILED" ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-red-400">Video generation failed.</p>
          {project.errorMessage && (
            <p className="text-sm text-zinc-400 max-w-xl mx-auto break-words">{project.errorMessage}</p>
          )}
          <p className="text-sm text-zinc-500">Try Fast Mode for quicker, more reliable renders.</p>
          <Button variant="outline" size="sm" onClick={() => fetchProject()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </Card>
      ) : project.finalVideoUrl ? (
        <VideoPlayer
          src={project.finalVideoUrl}
          title={project.title || undefined}
          downloadUrl={`/api/projects/${projectId}/download`}
          poster={project.thumbnailUrl || undefined}
        />
      ) : (
        <Card className="p-12 text-center">
          <p className="text-zinc-500">No video rendered yet.</p>
        </Card>
      )}

      {project.scenes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Scene Editor</h2>
          <SceneEditor
            scenes={project.scenes}
            projectId={projectId}
            onRegenerate={fetchProject}
          />
        </div>
      )}

      {project.socialMetadata && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">YouTube</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-zinc-300 font-medium">{project.socialMetadata.youtubeTitle}</p>
              <p className="text-zinc-500">{project.socialMetadata.youtubeDescription}</p>
              <p className="text-violet-400 text-xs">{project.socialMetadata.youtubeHashtags}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instagram / TikTok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-zinc-300">{project.socialMetadata.instagramCaption}</p>
              <p className="text-violet-400 text-xs">{project.socialMetadata.instagramHashtags}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-3">
        {project.finalVideoUrl && (
          <a href={`/api/projects/${projectId}/download`}>
            <Button>
              <Download className="h-4 w-4" />
              Download MP4
            </Button>
          </a>
        )}
        <Button variant="secondary" onClick={fetchProject}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <ProjectContent />
    </Suspense>
  );
}
