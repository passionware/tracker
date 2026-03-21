import { IconTile } from "@/features/_common/patterns/IconTile.tsx";
import { cn } from "@/lib/utils.ts";
import type { ReactNode } from "react";

export interface UploadDropCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  /** Classes on the inner region that wraps `children` (min-height, flex). */
  bodyClassName?: string;
}

/**
 * Framed upload section: accent icon + title copy, then drop/browse content below.
 * Shared by AI bank file matching and client logo upload.
 */
export function UploadDropCard({
  icon,
  title,
  description,
  children,
  className,
  bodyClassName,
}: UploadDropCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-gradient-to-b from-card to-card/50 p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <IconTile variant="accent">{icon}</IconTile>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground">
            {title}
          </h3>
          <p className="text-sm leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "flex min-h-[min(52vh,420px)] flex-1 flex-col lg:min-h-0",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
