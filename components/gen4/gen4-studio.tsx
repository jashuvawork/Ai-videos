"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { fetchJson, toUserFacingError } from "@/lib/api-client";

type RatioPreset = {
  label: string;
  width: number;
  height: number;
};

const RATIO_PRESETS: RatioPreset[] = [
  { label: "16:9 Landscape", width: 1280, height: 720 },
  { label: "9:16 Vertical", width: 720, height: 1280 },
  { label: "1:1 Square", width: 960, height: 960 },
];

export function Gen4Studio() {
  const [prompt, setPrompt] = useState(
    "Wide shot of a biscuit factory line — dough moving on conveyor, steam rising, workers in motion, documentary realism.",
  );
  const [duration, setDuration] = useState(5);
  const [ratio, setRatio] = useState(RATIO_PRESETS[0].label);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedRatio = RATIO_PRESETS.find((r) => r.label === ratio) ?? RATIO_PRESETS[0];

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const pollTask = useCallback(
    (id: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const { data, response } = await fetchJson<{
            status: string;
            progress?: number;
            provider?: string;
            videoUrl?: string;
            outputUrl?: string;
            failure?: string;
            error?: string;
          }>(`/api/gen4/tasks/${id}`);
          if (!response.ok) {
            throw new Error(data.error || "Failed to poll task");
          }

          setStatus(data.status);
          setProgress(data.progress ?? 0);
          if (data.provider) setProvider(data.provider);

          if (data.status === "SUCCEEDED") {
            setVideoUrl(data.videoUrl ?? data.outputUrl ?? null);
            setIsSubmitting(false);
            stopPolling();
          }

          if (data.status === "FAILED" || data.status === "CANCELLED") {
            setError(data.failure || `Generation ${data.status.toLowerCase()}`);
            setIsSubmitting(false);
            stopPolling();
          }
        } catch (pollError) {
          const message = pollError instanceof Error ? pollError.message : "Polling failed";
          setError(message);
          setIsSubmitting(false);
          stopPolling();
        }
      }, 2500);
    },
    [stopPolling],
  );

  const handleGenerate = async () => {
    setError(null);
    setVideoUrl(null);
    setTaskId(null);
    setProvider(null);
    setStatus(null);
    setProgress(0);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("prompt", prompt);
    formData.set("duration", String(duration));
    formData.set("width", String(selectedRatio.width));
    formData.set("height", String(selectedRatio.height));
    if (imageFile) formData.set("image", imageFile);

    try {
      const { data, response } = await fetchJson<{
        taskId: string;
        provider?: string;
        status?: string;
        error?: string;
      }>("/api/gen4/video", { method: "POST", body: formData });
      if (!response.ok) {
        throw new Error(data.error || "Failed to start generation");
      }

      setTaskId(data.taskId);
      setProvider(data.provider ?? "studio");
      setStatus(data.status ?? "PENDING");
      setProgress(5);
      pollTask(data.taskId);
    } catch (submitError) {
      setError(toUserFacingError(submitError));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Gen-4 Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-zinc-500">
            Built-in engine — Pollinations AI stills + multi-frame motion synthesis. No Runway API required.
          </p>

          <div className="space-y-2">
            <Label htmlFor="gen4-prompt">Motion prompt</Label>
            <Textarea
              id="gen4-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Describe visible motion: conveyor belts, steam, workers, camera movement..."
              className="bg-zinc-950 border-zinc-700"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Select
                options={[2, 3, 4, 5, 6, 7, 8, 9, 10].map((sec) => ({
                  value: String(sec),
                  label: `${sec}s`,
                }))}
                value={String(duration)}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Aspect ratio</Label>
              <Select
                options={RATIO_PRESETS.map((preset) => ({
                  value: preset.label,
                  label: preset.label,
                }))}
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reference image (optional — image-driven motion)</Label>
            <div className="flex flex-col gap-3">
              <label
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400 hover:border-violet-600/50 hover:text-zinc-200 transition-colors"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>{imageFile ? imageFile.name : "Upload a still to anchor the motion clip"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Reference preview"
                  className="max-h-40 rounded-lg border border-zinc-800 object-contain"
                />
              )}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isSubmitting || !prompt.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating motion video...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Generate Gen-4 Video
              </>
            )}
          </Button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Video className="h-5 w-5 text-violet-400" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isSubmitting || status) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>{status ?? "Starting..."}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              {taskId && (
                <p className="text-xs text-zinc-500 font-mono truncate">
                  {provider ? `${provider} · ` : ""}Task: {taskId}
                </p>
              )}
            </div>
          )}

          <div className="aspect-video rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center px-6 py-12 text-zinc-500">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  {isSubmitting
                    ? "Building multi-frame motion clip with built-in Gen-4 engine..."
                    : "Your generated clip will appear here"}
                </p>
              </div>
            )}
          </div>

          {videoUrl && (
            <a
              href={videoUrl}
              download
              className="text-sm text-violet-400 hover:text-violet-300 underline"
            >
              Download MP4
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
