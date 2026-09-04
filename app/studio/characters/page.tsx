"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Project {
  id: string;
  title: string | null;
  storyPlan: { characters: Array<{ name: string; role: string; description: string }> } | null;
}

export default function CharactersPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/studio/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  const allChars = projects.flatMap((p) =>
    (p.storyPlan?.characters ?? []).map((c) => ({ ...c, projectId: p.id, projectTitle: p.title })),
  );

  return (
    <div className="p-6 sm:p-10 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Characters</h1>
      <p className="text-zinc-500 text-sm">Characters are created per project by the Story Director.</p>
      {allChars.length === 0 ? (
        <Card className="border-zinc-800 p-8 text-center text-zinc-500">
          No characters yet.{" "}
          <Link href="/studio/create" className="text-red-400 hover:underline">
            Create a story
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {allChars.map((c, i) => (
            <Card key={`${c.projectId}-${i}`} className="border-zinc-800 bg-zinc-900/30">
              <CardContent className="p-4">
                <p className="font-medium text-zinc-200">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.role} · {c.projectTitle}</p>
                <p className="text-sm text-zinc-400 mt-2">{c.description}</p>
                <Link href={`/studio/projects/${c.projectId}`}>
                  <Button size="sm" variant="outline" className="mt-3 border-zinc-700">
                    View project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
