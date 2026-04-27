import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";

/**
 * Unique billing ids linked through reports assigned to a project iteration.
 * Matches the project timeline “Billings” sub-lane (see `buildProjectTimelineLanesAndItems`).
 */
export function billingIdsLinkedToIterationReports(
  entries: ReportViewEntry[],
): number[] {
  const seen = new Set<number>();
  for (const e of entries) {
    for (const row of e.originalReport.linkBillingReport) {
      if (row.billing != null) {
        seen.add(row.billing.id);
      }
    }
  }
  return [...seen].sort((a, b) => a - b);
}
