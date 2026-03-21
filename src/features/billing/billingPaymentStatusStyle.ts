import type { BillingTimelineColorBy } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type { CalendarDate } from "@internationalized/date";

function billingLinkingStatusBarClass(
  status: BillingViewEntry["status"],
): string {
  switch (status) {
    case "unmatched":
      return "bg-rose-500";
    case "partially-matched":
      return "bg-amber-500";
    case "clarified":
      return "bg-emerald-500";
    case "overmatched":
      return "bg-violet-500";
    case "matched":
      return "bg-emerald-500";
  }
}

function billingLinkingStatusTableRowClassName(
  status: BillingViewEntry["status"],
): string {
  switch (status) {
    case "unmatched":
      return "border-l-[3px] border-l-rose-500";
    case "partially-matched":
      return "border-l-[3px] border-l-amber-500";
    case "clarified":
      return "border-l-[3px] border-l-emerald-500";
    case "overmatched":
      return "border-l-[3px] border-l-violet-500";
    case "matched":
      return "border-l-[3px] border-l-emerald-500";
  }
}

/**
 * Timeline bar fill — matches Paid column RollingBadge (neutral vs positive).
 */
export function billingPaymentTimelineBarClass(
  paidAt: CalendarDate | null,
): string {
  return paidAt == null ? "bg-slate-500" : "bg-emerald-600";
}

/**
 * Table row accent — same paid/unpaid semantics as the timeline and Paid badge.
 */
export function billingPaymentTableRowClassName(
  paidAt: CalendarDate | null,
): string {
  return paidAt == null
    ? "border-l-[3px] border-l-slate-400"
    : "border-l-[3px] border-l-emerald-600";
}

export function getBillingTimelineItemColor(
  billing: BillingViewEntry,
  colorBy: BillingTimelineColorBy,
  laneColor: string | undefined,
): string {
  switch (colorBy) {
    case "group":
      return laneColor ?? "bg-chart-1";
    case "linking-status":
      return billingLinkingStatusBarClass(billing.status);
    case "payment-status":
      return billingPaymentTimelineBarClass(billing.paidAt);
  }
}

export function getBillingTableRowClassName(
  billing: BillingViewEntry,
  colorBy: BillingTimelineColorBy,
): string | undefined {
  switch (colorBy) {
    case "group":
      return undefined;
    case "linking-status":
      return billingLinkingStatusTableRowClassName(billing.status);
    case "payment-status":
      return billingPaymentTableRowClassName(billing.paidAt);
  }
}
