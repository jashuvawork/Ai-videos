"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VoicesPage() {
  const [providers, setProviders] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/studio/stats")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers));
  }, []);

  return (
    <div className="p-6 sm:p-10 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Voices</h1>
      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardContent className="p-6 space-y-4">
          <p className="text-zinc-400 text-sm">
            Narration uses ElevenLabs when configured, otherwise Edge TTS (free). Emotion direction from the Story Director is passed to the voice provider.
          </p>
          {providers && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Active: {String(providers.voice)}</Badge>
              {providers.elevenLabsConfigured ? (
                <Badge variant="success">ElevenLabs configured</Badge>
              ) : (
                <Badge variant="warning">ElevenLabs not configured — using Edge TTS</Badge>
              )}
            </div>
          )}
          <Link href="/studio/providers">
            <Button variant="outline" className="border-zinc-700">
              Provider settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
