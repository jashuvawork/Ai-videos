import Link from "next/link";
import { Button } from "@/components/ui/button";

function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="p-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">{title}</h1>
      <p className="text-zinc-500 mb-6">Coming in {phase}. Provider not configured messages will appear here when applicable.</p>
      <Link href="/studio/create">
        <Button className="bg-red-600 hover:bg-red-500">Create Story</Button>
      </Link>
    </div>
  );
}

export default function GameplayPage() {
  return <Placeholder title="Gameplay Library" phase="Phase 4" />;
}
