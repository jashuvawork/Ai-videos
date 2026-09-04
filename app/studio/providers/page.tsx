import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProviderStatus } from "@/providers";

export default async function StudioProvidersPage() {
  const status = await getProviderStatus();

  const providers = [
    {
      name: "OpenAI",
      envKey: "OPENAI_API_KEY",
      configured: status.llm === "openai" || Boolean(process.env.OPENAI_API_KEY),
      active: status.llm === "openai",
      note: "Story Director LLM (optional — built-in director works without it)",
    },
    {
      name: "ElevenLabs",
      envKey: "ELEVENLABS_API_KEY",
      configured: status.elevenLabsConfigured,
      active: status.voice === "elevenlabs",
      note: "Cinematic narration & character dialogue",
    },
    {
      name: "Runway",
      envKey: "RUNWAY_API_KEY",
      configured: status.runwayApiKeyConfigured,
      active: status.video === "runway",
      note: "AI cinematic shot inserts",
    },
    {
      name: "Studio (built-in)",
      envKey: "—",
      configured: true,
      active: status.llm === "studio",
      note: "Free story director, Pollinations images, FFmpeg motion, Edge TTS fallback",
    },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">API Providers</h1>
        <p className="text-zinc-500 mt-1">
          Configure keys as server environment variables. Keys are never exposed to the browser.
        </p>
      </div>

      <Card className="border-amber-900/40 bg-amber-950/20">
        <CardContent className="p-4 text-sm text-amber-200/90">
          Set <code className="text-zinc-300">ELEVENLABS_API_KEY</code> and{" "}
          <code className="text-zinc-300">RUNWAY_API_KEY</code> on Railway/Vercel.
          Rotate any key that was shared in chat.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {providers.map((p) => (
          <Card key={p.name} className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-zinc-200">{p.name}</CardTitle>
                <div className="flex gap-2">
                  {p.configured ? (
                    <Badge variant="success">Configured</Badge>
                  ) : (
                    <Badge variant="warning">Not configured</Badge>
                  )}
                  {p.active && <Badge variant="outline">Active</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-zinc-500 space-y-1">
              <p>Env: <code className="text-zinc-400">{p.envKey}</code></p>
              <p>{p.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
