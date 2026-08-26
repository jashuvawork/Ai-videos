"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SUPPORTED_LANGUAGES } from "@/config/video";

const VIDEO_TYPES = [
  { value: "STORY", label: "Story" },
  { value: "CINEMATIC", label: "Cinematic" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "MOTIVATION", label: "Motivation" },
  { value: "DOCUMENTARY", label: "Documentary" },
  { value: "ADVERTISEMENT", label: "Advertisement" },
  { value: "PRODUCT", label: "Product" },
  { value: "NEWS", label: "News" },
  { value: "QUOTE", label: "Quote" },
  { value: "HORROR", label: "Horror" },
  { value: "COMEDY", label: "Comedy" },
  { value: "CUSTOM", label: "Custom" },
];

const PLATFORMS = [
  { value: "INSTAGRAM_REEL", label: "Instagram Reel" },
  { value: "YOUTUBE_SHORT", label: "YouTube Short" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "CUSTOM", label: "Custom" },
];

const ASPECT_RATIOS = [
  { value: "RATIO_9_16", label: "9:16 Vertical" },
  { value: "RATIO_16_9", label: "16:9 Landscape" },
  { value: "RATIO_1_1", label: "1:1 Square" },
];

const DURATIONS = [
  { value: "15", label: "15 sec" },
  { value: "30", label: "30 sec" },
  { value: "45", label: "45 sec" },
  { value: "60", label: "60 sec" },
  { value: "90", label: "90 sec" },
];

const VISUAL_STYLES = [
  { value: "CINEMATIC", label: "Cinematic" },
  { value: "PHOTOREALISTIC", label: "Photorealistic" },
  { value: "ANIME", label: "Anime" },
  { value: "THREE_D", label: "3D" },
  { value: "PIXAR_LIKE", label: "Pixar-like 3D" },
  { value: "DOCUMENTARY", label: "Documentary" },
  { value: "DARK_CINEMATIC", label: "Dark Cinematic" },
  { value: "FANTASY", label: "Fantasy" },
  { value: "SCI_FI", label: "Sci-fi" },
  { value: "VINTAGE", label: "Vintage" },
  { value: "MINIMAL", label: "Minimal" },
  { value: "CUSTOM", label: "Custom" },
];

const VOICES = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "NEUTRAL", label: "Neutral" },
  { value: "NONE", label: "No voice" },
];

export function CreateVideoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicMode, setMagicMode] = useState(false);

  const [form, setForm] = useState({
    idea: "",
    videoType: "STORY",
    platform: "INSTAGRAM_REEL",
    aspectRatio: "RATIO_9_16",
    duration: "30",
    visualStyle: "PHOTOREALISTIC",
    voice: "MALE",
    language: "en",
    generationMode: "FAST",
    visualGenerationMode: "IMAGES",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idea.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: form.idea,
          videoType: form.videoType,
          platform: form.platform,
          aspectRatio: form.aspectRatio,
          duration: parseInt(form.duration, 10),
          visualStyle: form.visualStyle,
          voice: form.voice,
          language: form.language,
          generationMode: form.generationMode,
          visualGenerationMode: form.visualGenerationMode,
          magicGenerate: magicMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      const genRes = await fetch(`/api/projects/${data.project.id}/generate`, { method: "POST" });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Failed to start generation");

      router.push(`/projects/${data.project.id}?jobId=${genData.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <Label className="text-zinc-300 text-base">Tell me what you want your video to be about…</Label>
        <Textarea
          placeholder="A young pilot gets lost during a storm and discovers an abandoned island."
          value={form.idea}
          onChange={(e) => setForm({ ...form, idea: e.target.value })}
          className="min-h-[140px] text-base"
          required
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={magicMode ? "default" : "outline"}
          size="sm"
          onClick={() => setMagicMode(!magicMode)}
        >
          <Sparkles className="h-4 w-4" />
          Magic Generate
        </Button>
        <Button
          type="button"
          variant={form.generationMode === "CINEMATIC" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setForm({
              ...form,
              generationMode: form.generationMode === "CINEMATIC" ? "FAST" : "CINEMATIC",
              visualGenerationMode:
                form.generationMode === "CINEMATIC" ? "IMAGES" : "AI_VIDEO",
            })
          }
        >
          <Zap className="h-4 w-4" />
          {form.generationMode === "CINEMATIC"
            ? "Cinematic (slower, more scenes)"
            : "Fast Mode (~1–2 min)"}
        </Button>
        <Button
          type="button"
          variant={form.visualStyle === "PHOTOREALISTIC" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setForm({
              ...form,
              visualStyle: "PHOTOREALISTIC",
              generationMode: "CINEMATIC",
              visualGenerationMode: "AI_VIDEO",
            })
          }
        >
          Photorealistic
        </Button>
      </div>

      {!magicMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Video Type</Label>
            <Select
              options={VIDEO_TYPES}
              value={form.videoType}
              onChange={(e) => setForm({ ...form, videoType: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              options={PLATFORMS}
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select
              options={ASPECT_RATIOS}
              value={form.aspectRatio}
              onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              options={DURATIONS}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Visual Style</Label>
            <Select
              options={VISUAL_STYLES}
              value={form.visualStyle}
              onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select
              options={VOICES}
              value={form.voice}
              onChange={(e) => setForm({ ...form, voice: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading || !form.idea.trim()}>
        {loading ? "Creating..." : "Generate Video"}
      </Button>
    </form>
  );
}
