import { cn } from "@/lib/utils.ts";
import type { HTMLAttributes } from "react";

/**
 * Single row inside drawers / panels: matches `InfoHeaderSection` inset tone
 * (`bg-muted/30` + border) for entity summaries and list rows.
 */
export function MutedInsetRow({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}
