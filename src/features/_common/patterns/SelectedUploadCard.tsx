import { cn } from "@/lib/utils.ts";
import type { ReactNode } from "react";

export interface SelectedUploadCardProps {
  /** Icon tile, thumbnail, or other lead (e.g. `IconTile` + `FileText`). */
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions: ReactNode;
  className?: string;
}

/**
 * Selected file / asset row: inset card with lead, title stack, and trailing actions.
 * Used after a file is chosen (AI bank matcher, logo upload, etc.).
 */
export function SelectedUploadCard({
  leading,
  title,
  subtitle,
  actions,
  className,
}: SelectedUploadCardProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col rounded-xl border border-border/80 bg-muted/25 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leading}
          <div className="min-w-0 flex-1">
            <div className="break-words text-sm font-medium leading-snug text-foreground">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      </div>
    </div>
  );
}
