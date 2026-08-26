import { CreateVideoForm } from "@/components/project/create-video-form";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="gradient-radial min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-800/50 bg-violet-950/30 px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Sparkles className="h-4 w-4" />
            AI Video Studio
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 mb-4">
            Create an AI Video
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Give me an idea. I&apos;ll turn it into a video.
          </p>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CreateVideoForm />
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { title: "Story → Script", desc: "AI writes compelling narratives" },
            { title: "Scenes → Visuals", desc: "Generated images & video clips" },
            { title: "Voice → MP4", desc: "Narration, music, and rendering" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-6">
              <h3 className="font-semibold text-zinc-200 mb-1">{item.title}</h3>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
