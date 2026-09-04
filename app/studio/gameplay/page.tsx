"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gamepad2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";

interface Clip {
  id: string;
  originalFilename: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  status: string;
  metadata: Record<string, unknown> | null;
}

export default function GameplayPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [uploading, setUploading] = useState(false);
  const [assetRights, setAssetRights] = useState("OWNED");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const { data } = await fetchJson<{ clips?: Clip[] }>("/api/studio/gameplay");
      setClips(data.clips || []);
    } catch {
      setClips([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("video", file);
      form.append("assetRights", assetRights);
      const { data, response } = await fetchJson<{ clip?: Clip; error?: string }>(
        "/api/studio/gameplay",
        { method: "POST", body: form },
      );
      if (!response.ok) throw new Error(data.error || "Upload failed");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Gameplay Library</h1>
        <p className="text-zinc-500 mt-1">
          Upload licensed gameplay clips. ffprobe analyzes each file and tags it for scene matching.
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/30 border-dashed">
        <CardContent className="p-8 text-center space-y-4">
          <Upload className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-zinc-400 text-sm">MP4, MOV, or WebM — up to 500MB</p>
          <div className="flex justify-center gap-2 items-center text-sm">
            <label className="text-zinc-500">Asset rights:</label>
            <select
              value={assetRights}
              onChange={(e) => setAssetRights(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
            >
              <option value="OWNED">Owned by me</option>
              <option value="LICENSED">Licensed</option>
              <option value="PUBLIC_DOMAIN">Public domain</option>
              <option value="OTHER_PERMISSION">Other permission</option>
            </select>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-red-600 hover:bg-red-500"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              "Upload Gameplay"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {clips.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No clips yet.</p>
        ) : (
          clips.map((clip) => (
            <div
              key={clip.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-200 truncate flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-red-400 shrink-0" />
                  {clip.originalFilename}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {clip.duration ? formatDuration(clip.duration) : "—"} ·{" "}
                  {clip.width && clip.height ? `${clip.width}×${clip.height}` : "—"} · {clip.status}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {clip.tags.slice(0, 8).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Link href="/studio/create">
        <Button variant="outline" className="border-zinc-700">
          Create Story
        </Button>
      </Link>
    </div>
  );
}
