"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, PlusCircle, Sparkles, TrendingUp, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";

interface Stats {
  projects: number;
  rendering: number;
  completed: number;
  published: number;
  creditsUsed: number;
}

interface Project {
  id: string;
  title: string | null;
  idea: string;
  studioStatus: string | null;
  duration: number;
  qualityScore: number | null;
  createdAt: string;
  thumbnailUrl: string | null;
}

export default function StudioDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/studio/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setProviders(data.providers);
      });
    fetch("/api/studio/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []));
  }, []);

  const cards = [
    { label: "Projects", value: stats?.projects ?? 0, icon: Film },
    { label: "Videos Generated", value: stats?.completed ?? 0, icon: Video },
    { label: "Rendering", value: stats?.rendering ?? 0, icon: TrendingUp },
    { label: "Published", value: stats?.published ?? 0, icon: Upload },
    { label: "Credits Used", value: `$${(stats?.creditsUsed ?? 0).toFixed(2)}`, icon: Sparkles },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">AI Cinematic YouTube Story Studio</h1>
          <p className="text-zinc-500 mt-1">Gameplay + AI shots + ElevenLabs voice + FFmpeg editing</p>
        </div>
        <Link href="/studio/create">
          <Button className="bg-red-600 hover:bg-red-500">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Story
          </Button>
        </Link>
      </div>

      {providers && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Voice: {String(providers.voice)}</Badge>
          <Badge variant="outline">LLM: {String(providers.llm)}</Badge>
          <Badge variant="outline">Video: {String(providers.video)}</Badge>
          {providers.elevenLabsConfigured ? (
            <Badge variant="success">ElevenLabs ready</Badge>
          ) : (
            <Badge variant="warning">ElevenLabs not configured</Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{card.label}</p>
                  <Icon className="h-4 w-4 text-red-400/70" />
                </div>
                <p className="text-2xl font-bold text-zinc-100 mt-2">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-zinc-200">Recent Story Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">
              No story projects yet.{" "}
              <Link href="/studio/create" className="text-red-400 hover:underline">
                Create your first cinematic story
              </Link>
            </p>
          ) : (
            projects.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                href={`/studio/projects/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 hover:border-zinc-700 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-200 truncate">{p.title || p.idea.slice(0, 60)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatDuration(p.duration)} · {p.studioStatus ?? "DRAFT"}
                  </p>
                </div>
                {p.qualityScore != null && (
                  <Badge variant="success">{p.qualityScore.toFixed(1)}/10</Badge>
                )}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
