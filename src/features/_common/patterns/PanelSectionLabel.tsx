import { cn } from "@/lib/utils.ts";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PanelSectionLabel({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center gap-2 text-muted-foreground", className)}>
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      <span className="text-xs font-semibold uppercase tracking-wide">
        {children}
      </span>
    </div>
  );
}
