import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { env } from "@/config/env";
import { getActiveProviderNames } from "@/providers";
import { isRunwayConfigured } from "@/providers/runway/client";

export default function SettingsPage() {
  const active = getActiveProviderNames();
  const runwayConfigured = isRunwayConfigured();

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
            { label: "LLM", configured: env.AI_TEXT_PROVIDER, active: active.llm },
            { label: "Image", configured: env.AI_IMAGE_PROVIDER, active: active.image },
            { label: "Video", configured: env.AI_VIDEO_PROVIDER, active: active.video },
            { label: "Voice", configured: env.AI_VOICE_PROVIDER, active: active.voice },
            { label: "Music", configured: env.AI_MUSIC_PROVIDER, active: active.music },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-300">{p.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{p.configured}</span>
                <Badge variant={p.active === "mock" ? "warning" : "success"}>{p.active}</Badge>
              </div>
            </div>
          ))}
          {!active.realistic && (
            <p className="text-xs text-amber-400/80 mt-2">
              Placeholder visuals active — set providers to <code className="text-zinc-400">studio</code> / <code className="text-zinc-400">edge</code> (default, no API keys) or add paid API keys.
            </p>
          )}
          {active.zeroApiKeys && !runwayConfigured && (
            <p className="text-xs text-emerald-400/80 mt-2">
              Zero-API-key Studio mode — Pollinations images, Edge TTS, FFmpeg motion.
            </p>
          )}
          {runwayConfigured && (
            <p className="text-xs text-violet-400/90 mt-2">
              Runway Gen-4 enabled — scene videos use true AI motion via Gen-4 Turbo when a reference still exists.
              Open <a href="/gen4" className="underline hover:text-violet-300">Gen-4 Studio</a> for standalone clips.
            </p>
          )}
          {!runwayConfigured && (
            <p className="text-xs text-zinc-500 mt-2">
              Add <code className="text-zinc-400">RUNWAY_API_KEY</code> (or <code className="text-zinc-400">VIDEO_API_KEY</code>)
              for Runway Gen-4 real-time video instead of FFmpeg motion fallback.
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
