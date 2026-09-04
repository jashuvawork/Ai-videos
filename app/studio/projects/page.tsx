import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StudioProjectsPage() {
  return (
    <div className="p-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Projects</h1>
      <p className="text-zinc-500 mb-6">All story studio projects are listed on the dashboard.</p>
      <Link href="/studio">
        <Button variant="secondary">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
