import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CharactersPage() {
  return (
    <div className="p-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Characters</h1>
      <p className="text-zinc-500 mb-6">Characters are created per project in the Story Director plan. Global character library — Phase 9.</p>
      <Link href="/studio/create">
        <Button className="bg-red-600 hover:bg-red-500">Create Story</Button>
      </Link>
    </div>
  );
}
