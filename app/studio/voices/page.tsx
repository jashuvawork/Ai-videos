import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VoicesPage() {
  return (
    <div className="p-10 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-zinc-100">Voices</h1>
      <p className="text-zinc-500">
        ElevenLabs powers cinematic narration when <code className="text-zinc-400">ELEVENLABS_API_KEY</code> is set.
        Voice generation runs per scene in Phase 6.
      </p>
      <Link href="/studio/providers">
        <Button variant="secondary">Check API Providers</Button>
      </Link>
    </div>
  );
}
