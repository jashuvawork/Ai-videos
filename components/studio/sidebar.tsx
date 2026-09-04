"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  FolderOpen,
  Gamepad2,
  LayoutDashboard,
  Mic2,
  Music,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/projects", label: "Projects", icon: FolderOpen },
  { href: "/studio/create", label: "Create Story", icon: PlusCircle },
  { href: "/studio/gameplay", label: "Gameplay Library", icon: Gamepad2 },
  { href: "/studio/characters", label: "Characters", icon: Users },
  { href: "/studio/voices", label: "Voices", icon: Mic2 },
  { href: "/studio/music", label: "Music", icon: Music },
  { href: "/studio/youtube", label: "YouTube", icon: Video },
  { href: "/studio/providers", label: "API Providers", icon: Zap },
  { href: "/studio/admin", label: "Debug / Jobs", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function StudioSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/90">
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-800/80 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-900/30">
          <Clapperboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100 leading-tight">AI Story Studio</p>
          <p className="text-[10px] text-zinc-500">Cinematic YouTube</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/studio" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-red-950/50 text-red-200 border border-red-900/40"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-4">
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-red-400" />
            Full Pipeline
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Story → gameplay match → AI shots → ElevenLabs voice → FFmpeg render → QC → YouTube metadata.
          </p>
        </div>
      </div>
    </aside>
  );
}
