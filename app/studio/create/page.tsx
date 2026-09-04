"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { fetchJson, toUserFacingError } from "@/lib/api-client";

const GENRES = [
  "Crime Thriller",
  "Action",
  "Drama",
  "Mystery",
  "Heist",
  "Survival",
  "Romance",
  "Horror",
];

const VISUAL_STYLES = [
  "Cinematic GTA",
  "Realistic GTA V",
  "Noir City",
  "Documentary Crime",
  "Hyper-realistic",
];

const NARRATION_STYLES = [
  "Deep cinematic male",
  "Warm female narrator",
  "Gritty male",
  "Neutral documentary",
];

export default function CreateStoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    idea: "A poor taxi driver accidentally picks up a billionaire who is being hunted by the police.",
    genre: "Crime Thriller",
    durationMinutes: "8",
    visualStyle: "Cinematic GTA",
    narrationStyle: "Deep cinematic male",
    language: "en",
    targetAudience: "YouTube 18-34",
    gameplaySource: "My licensed GTA gameplay",
    voice: "MALE",
    musicStyle: "Suspense",
    pacing: "fast",
    assetRights: "OWNED",
    maxAiVideoShots: "12",
    gameplayPercent: "70",
    qcThreshold: "8",
    shortsCount: "5",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const gameplayPercent = Number(form.gameplayPercent);
    const maxAiVideoShots = Number(form.maxAiVideoShots);
    const qcThreshold = Number(form.qcThreshold);
    const shortsCount = Number(form.shortsCount);
    const durationMinutes = Number(form.durationMinutes);

    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      setError("Please choose a valid video length.");
      setLoading(false);
      return;
    }

    try {
      const { data: createData, response: createRes } = await fetchJson<{
        project?: { id: string };
        error?: string;
      }>("/api/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: form.idea.trim(),
          genre: form.genre,
          durationMinutes,
          visualStyle: form.visualStyle,
          narrationStyle: form.narrationStyle,
          language: form.language,
          targetAudience: form.targetAudience,
          gameplaySource: form.gameplaySource,
          voice: form.voice,
          musicStyle: form.musicStyle,
          pacing: form.pacing,
          assetRights: form.assetRights,
          advanced: {
            maxAiVideoShots: Number.isFinite(maxAiVideoShots) ? maxAiVideoShots : 12,
            gameplayPercent: Number.isFinite(gameplayPercent) ? gameplayPercent : 70,
            aiVisualPercent: Number.isFinite(gameplayPercent) ? 100 - gameplayPercent : 30,
            qcThreshold: Number.isFinite(qcThreshold) ? qcThreshold : 8,
            shortsCount: Number.isFinite(shortsCount) ? shortsCount : 5,
            visualStyle: form.visualStyle,
            musicStyle: form.musicStyle,
          },
        }),
      });

      if (!createRes.ok || !createData.project?.id) {
        throw new Error(createData.error || "Failed to create project");
      }

      const { data: genData, response: genRes } = await fetchJson<{ error?: string }>(
        `/api/studio/projects/${createData.project.id}/generate-story`,
        { method: "POST" },
      );
      if (!genRes.ok) throw new Error(genData.error || "Story generation failed");

      router.push(`/studio/projects/${createData.project.id}`);
    } catch (err) {
      setError(toUserFacingError(err));
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">Create Story</h1>
        <p className="text-zinc-500 mt-1">
          Turn your idea into a cinematic YouTube production plan — gameplay + AI inserts + voice.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader>
            <CardTitle className="text-zinc-200 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-red-400" />
              Story Idea
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Story idea</Label>
              <Textarea
                value={form.idea}
                onChange={(e) => setForm({ ...form, idea: e.target.value })}
                rows={4}
                className="bg-zinc-950 border-zinc-700"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  options={GENRES.map((g) => ({ value: g, label: g }))}
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Length (minutes)</Label>
                <Select
                  options={["3", "5", "8", "10", "15", "20"].map((m) => ({
                    value: m,
                    label: `${m} min`,
                  }))}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Visual style</Label>
                <Select
                  options={VISUAL_STYLES.map((v) => ({ value: v, label: v }))}
                  value={form.visualStyle}
                  onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Narration style</Label>
                <Select
                  options={NARRATION_STYLES.map((n) => ({ value: n, label: n }))}
                  value={form.narrationStyle}
                  onChange={(e) => setForm({ ...form, narrationStyle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pacing</Label>
                <Select
                  options={[
                    { value: "slow", label: "Slow" },
                    { value: "medium", label: "Medium" },
                    { value: "fast", label: "Fast" },
                  ]}
                  value={form.pacing}
                  onChange={(e) => setForm({ ...form, pacing: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Voice (ElevenLabs)</Label>
                <Select
                  options={[
                    { value: "MALE", label: "Male" },
                    { value: "FEMALE", label: "Female" },
                    { value: "NEUTRAL", label: "Neutral" },
                  ]}
                  value={form.voice}
                  onChange={(e) => setForm({ ...form, voice: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gameplay source</Label>
              <Input
                value={form.gameplaySource}
                onChange={(e) => setForm({ ...form, gameplaySource: e.target.value })}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Asset rights</Label>
              <Select
                options={[
                  { value: "OWNED", label: "Owned by me" },
                  { value: "LICENSED", label: "Licensed" },
                  { value: "PUBLIC_DOMAIN", label: "Public domain" },
                  { value: "OTHER_PERMISSION", label: "Other permission" },
                ]}
                value={form.assetRights}
                onChange={(e) => setForm({ ...form, assetRights: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Settings
        </button>

        {showAdvanced && (
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Max AI video shots</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.maxAiVideoShots}
                  onChange={(e) => setForm({ ...form, maxAiVideoShots: e.target.value })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Gameplay % (rest = AI visuals)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.gameplayPercent}
                  onChange={(e) => setForm({ ...form, gameplayPercent: e.target.value })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>QC threshold (0-10)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.qcThreshold}
                  onChange={(e) => setForm({ ...form, qcThreshold: e.target.value })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Shorts to generate</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.shortsCount}
                  onChange={(e) => setForm({ ...form, shortsCount: e.target.value })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 h-12 text-base">
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating story with Story Director...
            </>
          ) : (
            "GENERATE STORY"
          )}
        </Button>
      </form>
    </div>
  );
}
