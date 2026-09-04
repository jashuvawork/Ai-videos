import { StudioSidebar } from "@/components/studio/sidebar";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-zinc-950">
      <StudioSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
