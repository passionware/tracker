"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { cn } from "@/lib/utils.ts";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { PanelSectionLabel } from "./PanelSectionLabel.tsx";
import { SurfaceCard } from "./SurfaceCard.tsx";

export type ExpandablePanelSectionProps = {
  label: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  /** When false (default), section starts collapsed. */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Opt out of Vaul drawer drag on this region. */
  dataVaulNoDrag?: boolean;
  className?: string;
  surfaceClassName?: string;
  contentClassName?: string;
  /** When true, inner body favors text selection (e.g. user-authored copy). */
  selectableContent?: boolean;
};

/**
 * Section heading (PanelSectionLabel) + chevron trigger; body in SurfaceCard when expanded.
 * Matches drawer “label + inset card” rhythm; use for long or optional blocks.
 */
export function ExpandablePanelSection({
  label,
  icon,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  dataVaulNoDrag,
  className,
  surfaceClassName,
  contentClassName,
  selectableContent,
}: ExpandablePanelSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn("space-y-0", className)}
      {...(dataVaulNoDrag ? ({ "data-vaul-no-drag": "" } as const) : {})}
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          "group flex max-w-full items-center gap-2 rounded-md border-0 bg-transparent p-2 -m-2 text-left shadow-none outline-none",
          "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <PanelSectionLabel icon={icon} className="mb-0 min-w-0">
          {label}
        </PanelSectionLabel>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <SurfaceCard
          className={cn(
            selectableContent && "select-text cursor-text",
            surfaceClassName,
            contentClassName,
          )}
        >
          {children}
        </SurfaceCard>
      </CollapsibleContent>
    </Collapsible>
  );
}
