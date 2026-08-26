import * as React from "react";
import { cn } from "@/lib/cn";

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-zinc-400 leading-none", className)}
      {...props}
    />
  );
}

export { Label };
