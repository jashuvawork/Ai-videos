"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Film, Gamepad2, Mic2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StoryPlan } from "@/lib/story-studio/schemas";

interface Project {
  id: string;
  title: string | null;
  idea: string;
  studioStatus: string | null;
  storyPlan: StoryPlan | null;
  genre: string | null;
  duration: number;
}

export default function StudioProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/studio/projects/${id}`)
      .then((r) => r.json())
      .then((data) => setProject(data.project))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-zinc-500">Loading story...</div>;
  if (!project) return <div className="p-10 text-red-400">Project not found</div>;

  const plan = project.storyPlan;

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
        <Badge variant={project.studioStatus === "STORY_READY" ? "success" : "warning"}>
          {project.studioStatus ?? "DRAFT"}
        </Badge>
      </div>

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
                <p className="text-xs text-zinc-500">AI shots needed</p>
                <p className="text-zinc-200 font-medium">
                  {plan.scenes.filter((s) => s.aiVideoRequired).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-zinc-200 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-400" />
                Characters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {plan.characters.map((c) => (
                <div key={c.id} className="rounded-lg border border-zinc-800 p-4 bg-zinc-950/50">
                  <p className="font-medium text-zinc-200">{c.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{c.role}</p>
                  <p className="text-sm text-zinc-400 mt-2">{c.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-zinc-200 flex items-center gap-2">
                <Film className="h-5 w-5 text-red-400" />
                Storyboard ({plan.scenes.length} scenes)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.scenes.map((scene, i) => (
                <div
                  key={scene.sceneId}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-zinc-200">
                      Scene {i + 1} · {scene.duration}s
                    </p>
                    <div className="flex gap-2">
                      {scene.aiVideoRequired ? (
                        <Badge variant="warning">AI Video</Badge>
                      ) : (
                        <Badge variant="success">
                          <Gamepad2 className="h-3 w-3 mr-1 inline" />
                          Gameplay
                        </Badge>
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
                  {scene.gameplaySearchTerms.length > 0 && (
                    <p className="text-xs text-violet-400">
                      Gameplay tags: {scene.gameplaySearchTerms.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button disabled className="bg-zinc-800 text-zinc-500">
              Match Gameplay (Phase 4)
            </Button>
            <Button disabled className="bg-zinc-800 text-zinc-500">
              Generate Voice (Phase 6)
            </Button>
            <Button disabled className="bg-zinc-800 text-zinc-500">
              Render Video (Phase 8)
            </Button>
          </div>
        </>
      )}

      {!plan && (
        <Card className="p-8 text-center border-zinc-800">
          <p className="text-zinc-500 mb-4">Story plan not generated yet.</p>
          <Button
            onClick={async () => {
              await fetch(`/api/studio/projects/${id}/generate-story`, { method: "POST" });
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-500"
          >
            Generate Story
          </Button>
        </Card>
      )}
    </div>
  );
}
