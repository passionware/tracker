import { cn } from "@/lib/utils.ts";
import type { ReactNode } from "react";

export type IconTileVariant = "accent" | "muted";

const variantClass: Record<IconTileVariant, string> = {
  accent: "rounded-xl bg-primary/10 text-primary",
  muted:
    "rounded-lg border border-border/60 bg-background text-primary shadow-sm",
};

export function IconTile({
  children,
  variant = "accent",
  className,
}: {
  children: ReactNode;
  variant?: IconTileVariant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center [&_svg]:size-[1.125rem]",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
