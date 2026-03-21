import { cn } from "@/lib/utils.ts";

/** Dense bordered table inside drawers / forms (ListView wrapper). Uses fixed layout + % column widths so the grid fits the container without a forced min-width. */
export function embeddedListViewTableClassName(extra?: string) {
  return cn(
    "min-w-0 rounded-xl border border-border bg-card shadow-sm [&_table]:table-fixed [&_table]:w-full [&_table]:min-w-0",
    "[&_thead]:bg-muted/80 [&_thead_th]:min-w-0 [&_thead_th]:text-left [&_thead_th]:py-2.5 [&_thead_th]:px-3",
    "[&_tbody_td]:min-w-0 [&_tbody_td]:border-b [&_tbody_td]:border-border/70 [&_tbody_td]:py-3 [&_tbody_td]:px-3",
    "overflow-x-auto overflow-y-visible",
    extra,
  );
}
