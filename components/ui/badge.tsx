import * as React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-violet-600/20 text-violet-300 border border-violet-600/30",
        variant === "success" && "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30",
        variant === "warning" && "bg-amber-600/20 text-amber-300 border border-amber-600/30",
        variant === "error" && "bg-red-600/20 text-red-300 border border-red-600/30",
        variant === "outline" && "border border-zinc-700 text-zinc-400",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
