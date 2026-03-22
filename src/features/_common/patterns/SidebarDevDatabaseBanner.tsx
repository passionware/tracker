"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useSidebar } from "@/components/ui/sidebar.tsx";
import {
  getDevDatabaseSidebarLines,
  isLocalhostHostname,
} from "@/core/devDatabaseEnv.ts";
import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

export type DevDatabaseBannerViewProps = {
  lines: Array<{ label: string; schema: string }>;
  collapsed: boolean;
};

/**
 * Shows which app surfaces are pointed at non-production DB schemas (from Vite env).
 * Use {@link SidebarDevDatabaseBanner} in sidebars; this view is exported for Storybook.
 */
export function DevDatabaseBannerView({
  lines,
  collapsed,
}: DevDatabaseBannerViewProps) {
  if (lines.length === 0) {
    return null;
  }

  const detailText = lines
    .map((l) => `${l.label}: ${l.schema}`)
    .join("\n");

  const inner = (
    <div
      className={cn(
        "rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-left text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-50",
        collapsed &&
          "flex size-8 shrink-0 items-center justify-center p-0 [&_.banner-detail]:hidden",
      )}
      role="status"
      aria-label={`Non-production database: ${lines.map((l) => `${l.label} ${l.schema}`).join(", ")}`}
    >
      <div className="flex items-center gap-1.5 font-medium text-xs leading-none">
        <Database className="size-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="banner-detail truncate">Dev database</span>
      </div>
      <ul className="banner-detail mt-1 space-y-0.5 text-[11px] leading-snug opacity-90">
        {lines.map((line) => (
          <li key={line.label}>
            <span className="text-muted-foreground dark:text-amber-100/80">
              {line.label}:{" "}
            </span>
            <span className="font-mono tabular-nums">{line.schema}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" align="end" className="max-w-xs">
          <p className="mb-1 text-xs font-semibold">Non-production database</p>
          <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
            {detailText}
          </pre>
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export function SidebarDevDatabaseBanner() {
  const { state, isMobile } = useSidebar();
  const isLocalhost =
    typeof window !== "undefined" &&
    isLocalhostHostname(window.location.hostname);
  const lines = getDevDatabaseSidebarLines({ isLocalhost });
  const collapsed = state === "collapsed" && !isMobile;

  return <DevDatabaseBannerView lines={lines} collapsed={collapsed} />;
}
