import { cn } from "@/lib/utils.ts";
import * as React from "react";

export type ListViewTotalsBarProps = {
  children: React.ReactNode;
  /** Bulk operations (e.g. Actions dropdown) — shown left of a divider when present. */
  leftSlot?: React.ReactNode;
  /**
   * When true, this root applies sticky bottom (use when the bar is NOT inside a sticky tfoot).
   * When used inside ListView, prefer sticky on `TableFooter` and set this to false.
   */
  sticky?: boolean;
  className?: string;
};

/** Floating pill footer: bulk ops | stats — same layout with or without selection. */
export function ListViewTotalsBar({
  children,
  leftSlot,
  sticky = true,
  className,
}: ListViewTotalsBarProps) {
  const hasStats = children != null;
  const content = (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-2 overflow-x-auto sm:gap-x-3">
      {leftSlot && (
        <>
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2 [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none">
            {leftSlot}
          </div>
          {hasStats && (
            <div
              className="hidden h-5 w-px shrink-0 bg-border/70 sm:block"
              aria-hidden
            />
          )}
        </>
      )}
      {hasStats && <div className="min-w-0 flex-1 shrink">{children}</div>}
    </div>
  );

  return (
    <div
      className={cn(
        "mx-2 mb-2 mt-1 max-w-fit rounded-xl border border-border/80 px-2 py-1.5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.16)] sm:mx-auto sm:mb-3 sm:rounded-2xl sm:px-3 sm:py-2",
        sticky && [
          "sticky bottom-0 z-20",
          "bg-background/92 shadow-[0_-6px_24px_-14px_rgba(0,0,0,0.12)]",
          "backdrop-blur-md supports-[backdrop-filter]:bg-background/82",
        ],
        !sticky && "bg-transparent",
        className,
      )}
    >
      <div className="mx-auto flex w-full min-w-0 items-center">{content}</div>
    </div>
  );
}
