"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MusicPage() {
  return (
    <div className="p-6 sm:p-10 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Music</h1>
      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardContent className="p-6 space-y-4 text-sm text-zinc-400">
          <p>
            Background music is generated per project from the Story Director&apos;s mood tags (suspense, action, emotional).
            Music automatically ducks under narration during FFmpeg render.
          </p>
          <Link href="/studio/create">
            <Button className="bg-red-600 hover:bg-red-500">Create Story</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
