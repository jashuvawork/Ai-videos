import { Zap } from "lucide-react";
import { Gen4Studio } from "@/components/gen4/gen4-studio";
import { isRunwayConfigured } from "@/providers/runway/client";

export default function Gen4Page() {
  const runwayConfigured = isRunwayConfigured();

  return (
    <div className="gradient-radial min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-800/50 bg-violet-950/30 px-4 py-1.5 text-sm text-violet-300 mb-5">
            <Zap className="h-4 w-4" />
            Runway Gen-4 Real-Time Video
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-3">
            Gen-4 Studio
          </h1>
          <p className="text-zinc-400">
            Create true AI motion video with Runway Gen-4 Turbo (image-to-video) or Gen-4.5 (text-to-video).
            Factory and process shots get real movement — not Ken Burns stills.
          </p>
        </div>

        <Gen4Studio runwayConfigured={runwayConfigured} />
      </div>
    </div>
  );
}
