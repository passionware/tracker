import { cn } from "@/lib/utils.ts";
import type { KeyboardEvent, ReactNode } from "react";

export interface ClickableRegionProps {
  children: ReactNode;
  /** Invoked on click and on Enter / Space when focused. */
  onActivate: () => void;
  "aria-label": string;
  className?: string;
}

/**
 * Non-button interactive wrapper for rich children (e.g. entity views) where a
 * plain `<button>` would be invalid or awkward. Use for “open details” affordances.
 */
export function ClickableRegion({
  children,
  onActivate,
  "aria-label": ariaLabel,
  className,
}: ClickableRegionProps) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-no-row-open
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full cursor-pointer rounded-md px-2 py-1 outline-offset-2 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={onActivate}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
