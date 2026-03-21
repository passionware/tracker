import { cn } from "@/lib/utils.ts";
import type { HTMLAttributes } from "react";

/** Bordered inset panel used for settings / summary blocks in drawers and forms. */
export function SurfaceCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
