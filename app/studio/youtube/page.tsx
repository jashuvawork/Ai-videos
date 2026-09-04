"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string | null;
  studioStatus: string | null;
  qualityScore: number | null;
  socialMetadata?: {
    youtubeTitle?: string;
    youtubeDescription?: string;
    youtubeHashtags?: string;
  } | null;
  studioSettings?: { shorts?: Array<{ id: string; title: string; hook: string }> } | null;
}

export default function YoutubePage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/studio/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  const ready = projects.filter(
    (p) =>
      p.studioStatus === "READY_FOR_REVIEW" ||
      p.studioStatus === "APPROVED" ||
      p.studioStatus === "PUBLISHED" ||
      p.qualityScore != null,
  );

  return (
    <div className="p-6 sm:p-10 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">YouTube Publishing</h1>
        <p className="text-zinc-500 mt-1">
          Review metadata and Shorts concepts. OAuth upload requires YouTube credentials in Settings.
        </p>
        <Badge variant="warning" className="mt-3">
          Publishing requires explicit approval — never auto-publishes
        </Badge>
      </div>

      {ready.length === 0 ? (
        <Card className="border-zinc-800 p-8 text-center text-zinc-500">
          No videos ready for review. Complete a render first.
        </Card>
      ) : (
        ready.map((p) => (
          <Card key={p.id} className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Video className="h-4 w-4 text-red-400" />
                  {p.title || "Untitled"}
                </h2>
                {p.qualityScore != null && (
                  <Badge variant="success">QC {p.qualityScore.toFixed(1)}</Badge>
                )}
              </div>

              {p.socialMetadata?.youtubeTitle && (
                <div className="text-sm space-y-2">
                  <p className="text-zinc-200 font-medium">{p.socialMetadata.youtubeTitle}</p>
                  <p className="text-zinc-500 whitespace-pre-wrap line-clamp-4">
                    {p.socialMetadata.youtubeDescription}
                  </p>
                  {p.socialMetadata.youtubeHashtags && (
                    <p className="text-violet-400 text-xs">{p.socialMetadata.youtubeHashtags}</p>
                  )}
                </div>
              )}

              {p.studioSettings?.shorts && p.studioSettings.shorts.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Shorts concepts ({p.studioSettings.shorts.length})</p>
                  <div className="space-y-2">
                    {p.studioSettings.shorts.slice(0, 3).map((s) => (
                      <div key={s.id} className="text-xs text-zinc-400 border border-zinc-800 rounded p-2">
                        <span className="text-zinc-300">{s.title}</span> — {s.hook}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/studio/projects/${p.id}`}>
                  <Button size="sm" variant="outline" className="border-zinc-700">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Review
                  </Button>
                </Link>
                <Button size="sm" disabled className="bg-zinc-800 text-zinc-500">
                  Connect YouTube OAuth
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
