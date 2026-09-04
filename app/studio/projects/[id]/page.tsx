"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Film,
  Gamepad2,
  Loader2,
  Mic2,
  Play,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressTracker } from "@/components/project/progress-tracker";
import { VideoPlayer } from "@/components/project/video-player";
import { fetchJson } from "@/lib/api-client";
import type { StoryPlan } from "@/lib/story-studio/schemas";

interface Scene {
  id: string;
  sceneNumber: number;
  duration: number;
  narration: string | null;
  visualDescription: string | null;
  status: string;
  alternatives: { storyStudio?: { aiVideoRequired?: boolean; matchedClipId?: string; matchScore?: number } } | null;
}

interface Project {
  id: string;
  title: string | null;
  idea: string;
  studioStatus: string | null;
  storyPlan: StoryPlan | null;
  genre: string | null;
  duration: number;
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  qualityScore: number | null;
  studioSettings: { qcResult?: { overallScore: number; issues: string[] }; shorts?: unknown[] } | null;
  scenes: Scene[];
  jobs: Array<{ id: string; status: string }>;
  socialMetadata: { youtubeTitle?: string; youtubeDescription?: string } | null;
}

export default function StudioProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [costs, setCosts] = useState<{ total: number; summary: Record<string, number> } | null>(null);

  const load = useCallback(async () => {
    const { data, response } = await fetchJson<{ project?: Project }>(`/api/studio/projects/${id}`);
    if (!response.ok || !data.project) {
      setProject(null);
      return;
    }
    setProject(data.project);
    const running = data.project.jobs?.find(
      (j: { status: string }) => j.status === "RUNNING" || j.status === "PENDING",
    );
    if (running) setActiveJobId(running.id);

    try {
      const { data: costData } = await fetchJson<{ total: number; summary: Record<string, number> }>(
        `/api/studio/projects/${id}/costs`,
      );
      setCosts(costData);
    } catch {
      // costs optional
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const runAction = async (action: string, url: string) => {
    setBusy(action);
    try {
      const { data, response } = await fetchJson<{ job?: { id: string }; error?: string }>(url, {
        method: "POST",
      });
      if (!response.ok) throw new Error(data.error || "Action failed");
      if (data.job?.id) setActiveJobId(data.job.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading story...
      </div>
    );
  }
  if (!project) return <div className="p-10 text-red-400">Project not found</div>;

  const plan = project.storyPlan;
  const qc = project.studioSettings?.qcResult;

  return (
    <div className="p-6 sm:p-10 max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/studio" className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Studio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            {project.title || "Untitled Story"}
          </h1>
          <p className="text-zinc-500 mt-1 max-w-2xl">{plan?.logline || project.idea}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={project.studioStatus === "READY_FOR_REVIEW" ? "success" : "warning"}>
            {project.studioStatus ?? "DRAFT"}
          </Badge>
          {project.qualityScore != null && (
            <Badge variant="success">QC {project.qualityScore.toFixed(1)}/10</Badge>
          )}
        </div>
      </div>

      {project.finalVideoUrl && (
        <Card className="border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-zinc-200 flex items-center gap-2">
              <Play className="h-5 w-5 text-red-400" />
              Final Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VideoPlayer
              src={project.finalVideoUrl}
              poster={project.thumbnailUrl ?? undefined}
              downloadUrl={project.finalVideoUrl}
              title={project.title ?? undefined}
            />
          </CardContent>
        </Card>
      )}

      {activeJobId && (
        <Card className="border-zinc-800 bg-zinc-900/30 p-6">
          <ProgressTracker
            jobId={activeJobId}
            onComplete={() => {
              setActiveJobId(null);
              load();
            }}
          />
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {!plan && (
          <Button
            onClick={() => runAction("story", `/api/studio/projects/${id}/generate-story`)}
            disabled={!!busy}
            className="bg-red-600 hover:bg-red-500"
          >
            {busy === "story" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Story
          </Button>
        )}
        {plan && (
          <>
            <Button
              onClick={() => runAction("match", `/api/studio/projects/${id}/match-gameplay`)}
              disabled={!!busy || !!activeJobId}
              variant="outline"
              className="border-zinc-700"
            >
              {busy === "match" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gamepad2 className="h-4 w-4 mr-2" />}
              Match Gameplay
            </Button>
            <Button
              onClick={() => runAction("render", `/api/studio/projects/${id}/generate`)}
              disabled={!!busy || !!activeJobId}
              className="bg-red-600 hover:bg-red-500"
            >
              {busy === "render" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Render Full Video
            </Button>
            <Link href="/studio/gameplay">
              <Button variant="outline" className="border-zinc-700">
                Upload Gameplay
              </Button>
            </Link>
          </>
        )}
      </div>

      {costs && costs.total > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardContent className="p-4 flex flex-wrap gap-4 text-sm">
            <span className="text-zinc-400">Project cost:</span>
            {Object.entries(costs.summary).map(([k, v]) => (
              <span key={k} className="text-zinc-300 capitalize">
                {k}: ${v.toFixed(2)}
              </span>
            ))}
            <span className="text-red-400 font-medium">Total: ${costs.total.toFixed(2)}</span>
          </CardContent>
        </Card>
      )}

      {qc && (
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-zinc-200 text-base">Quality Control</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400 space-y-2">
            <p>Overall score: {qc.overallScore}/10</p>
            {qc.issues?.length > 0 && (
              <ul className="list-disc pl-5 text-amber-400">
                {qc.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {plan && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Genre</p>
                <p className="text-zinc-200 font-medium">{plan.genre}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Scenes</p>
                <p className="text-zinc-200 font-medium">{plan.scenes.length}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">AI shots</p>
                <p className="text-zinc-200 font-medium">
                  {plan.scenes.filter((s) => s.aiVideoRequired).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-zinc-200 flex items-center gap-2">
                <Film className="h-5 w-5 text-red-400" />
                Storyboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.scenes.map((scene, i) => {
                const dbScene = project.scenes?.find((s) => s.sceneNumber === i + 1);
                const meta = dbScene?.alternatives?.storyStudio;
                return (
                  <div
                    key={scene.sceneId}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-zinc-200">
                        Scene {i + 1} · {scene.duration}s
                        {dbScene?.status === "visual_complete" && (
                          <RefreshCw className="inline h-3 w-3 ml-2 text-emerald-400" />
                        )}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {meta?.matchedClipId ? (
                          <Badge variant="success">
                            <Gamepad2 className="h-3 w-3 mr-1 inline" />
                            Gameplay {meta.matchScore}%
                          </Badge>
                        ) : scene.aiVideoRequired ? (
                          <Badge variant="warning">AI Video</Badge>
                        ) : (
                          <Badge variant="outline">Gameplay TBD</Badge>
                        )}
                        {scene.narration && (
                          <Badge variant="outline">
                            <Mic2 className="h-3 w-3 mr-1 inline" />
                            Narration
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">{scene.purpose}</p>
                    {scene.narration && (
                      <p className="text-sm text-zinc-300 italic">&ldquo;{scene.narration}&rdquo;</p>
                    )}
                    <p className="text-xs text-zinc-500">{scene.visualDescription}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {project.socialMetadata?.youtubeTitle && (
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-zinc-200 text-base">YouTube Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-zinc-200 font-medium">{project.socialMetadata.youtubeTitle}</p>
            <p className="text-zinc-500 whitespace-pre-wrap">{project.socialMetadata.youtubeDescription}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
