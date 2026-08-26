import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { env } from "@/config/env";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-500 mt-1">Configure AI providers and defaults</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "LLM", value: env.AI_TEXT_PROVIDER },
            { label: "Image", value: env.AI_IMAGE_PROVIDER },
            { label: "Video", value: env.AI_VIDEO_PROVIDER },
            { label: "Voice", value: env.AI_VOICE_PROVIDER },
            { label: "Music", value: env.AI_MUSIC_PROVIDER },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-300">{p.label}</span>
              <Badge variant={p.value === "mock" ? "warning" : "success"}>{p.value}</Badge>
            </div>
          ))}
          {env.AI_TEXT_PROVIDER === "mock" && (
            <p className="text-xs text-amber-400/80 mt-2">
              Mock mode active — set API keys in .env to use real providers
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rendering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-400">
          <div className="flex justify-between">
            <span>FPS</span>
            <span className="text-zinc-300">{env.RENDER_FPS}</span>
          </div>
          <div className="flex justify-between">
            <span>Quality</span>
            <span className="text-zinc-300">{env.RENDER_QUALITY}</span>
          </div>
          <div className="flex justify-between">
            <span>Storage</span>
            <span className="text-zinc-300">{env.STORAGE_PROVIDER}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { name: "Instagram Reel", size: "1080 × 1920", ratio: "9:16" },
            { name: "YouTube Short", size: "1080 × 1920", ratio: "9:16" },
            { name: "YouTube", size: "1920 × 1080", ratio: "16:9" },
            { name: "Square Social", size: "1080 × 1080", ratio: "1:1" },
          ].map((preset) => (
            <div key={preset.name} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-300">{preset.name}</span>
              <span className="text-zinc-500">{preset.size} · {preset.ratio}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
