import { ListView } from "@/features/_common/ListView.tsx";
import { embeddedListViewTableClassName } from "@/features/_common/patterns/embeddedListViewClasses.ts";
import type { SortableQueryBase } from "@/features/_common/filters/SorterWidget.tsx";
import type { BillingMatcherDraftMatch } from "@/features/billing/billingMatcher.types.ts";
import { cn } from "@/lib/utils.ts";
import { rd } from "@passionware/monads";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";

export type BillingMatcherListQuery = SortableQueryBase;

const stickySectionHeadline = cn(
  "sticky top-0 z-10 -mx-1 border-b border-border/70 px-1 pb-2 pt-1 backdrop-blur-md",
  "supports-[backdrop-filter]:bg-background/90 bg-background/95",
);

const stickySectionHeadlineLow = cn(
  "sticky top-0 z-10 -mx-1 border-b border-amber-500/30 px-1 pb-2 pt-1 backdrop-blur-md",
  "bg-amber-500/[0.08] dark:bg-amber-500/[0.1]",
);

export function BillingMatcherMatchesTable({
  title,
  subtitle,
  rows,
  tone,
  columns,
  query,
}: {
  title: string;
  subtitle: string;
  rows: BillingMatcherDraftMatch[];
  tone: "high" | "medium" | "low";
  columns: ColumnDef<BillingMatcherDraftMatch>[];
  query: BillingMatcherListQuery;
}) {
  if (rows.length === 0) {
    return null;
  }
  const rowClassName =
    tone === "high"
      ? "transition-colors hover:bg-emerald-500/10 bg-emerald-500/[0.04]"
      : tone === "medium"
        ? "transition-colors hover:bg-muted/40"
        : "transition-colors hover:bg-amber-500/10 bg-amber-500/[0.06]";
  const list = (
    <ListView
      className={embeddedListViewTableClassName()}
      data={rd.of(rows)}
      query={query}
      onQueryChange={() => {}}
      getRowId={(row) => row.key}
      getRowClassName={() => rowClassName}
      columns={columns}
      stickyTableHeader={false}
    />
  );
  if (tone === "low") {
    return (
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-amber-500/45 bg-amber-500/[0.05] shadow-sm dark:bg-amber-500/[0.08]">
        <div className={cn(stickySectionHeadlineLow, "shrink-0 px-4 pt-4")}>
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  {title}
                </h4>
                <span className="shrink-0 rounded-md bg-amber-950/10 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-950 dark:bg-amber-400/15 dark:text-amber-100">
                  {rows.length}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-amber-950/85 dark:text-amber-100/80">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-4 pb-4 pt-2">{list}</div>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-col">
      <div className={cn(stickySectionHeadline, "shrink-0")}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {rows.length}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 pt-2">{list}</div>
    </div>
  );
}
