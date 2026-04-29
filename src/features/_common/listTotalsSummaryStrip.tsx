import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { cn } from "@/lib/utils.ts";
import type { FormatService } from "@/services/FormatService/FormatService.ts";
import { CurrencyValueGroup } from "@/services/ExchangeService/ExchangeService.ts";
import type {
  BillingView,
  CostView,
  ReportView,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { type ReactNode } from "react";

export type TotalsSummaryStripRow = {
  label: string;
  description?: ReactNode;
  group: CurrencyValueGroup;
};

/** Narrow bag passed to `SummaryCurrencyGroup` (`props.services` from list widgets satisfies this). */
export type TotalsSummaryStripFormatContext = {
  formatService: FormatService;
};

/** Same metrics as the reports list caption / timeline bulk bar (report totals). */
export function getReportViewTotalsStripRows(
  totals: ReportView["total"],
): TotalsSummaryStripRow[] {
  return [
    {
      label: "Reported",
      description: "Total value of reported work",
      group: totals.netAmount,
    },
    {
      label: "Billed",
      description: "How much billed value is linked to reports",
      group: totals.chargedAmount,
    },
    {
      label: "To link",
      description:
        "Report amount that is not yet linked to any billing",
      group: totals.toChargeAmount,
    },
    { label: "To pay", group: totals.toCompensateAmount },
    { label: "Paid", group: totals.compensatedAmount },
    {
      label: "To compensate",
      group: totals.toFullyCompensateAmount,
    },
  ];
}

/** Same metrics as the billings list caption / timeline bulk bar. */
export function getBillingViewTotalsStripRows(
  totals: BillingView["total"],
): TotalsSummaryStripRow[] {
  return [
    { label: "Charged", group: totals.netAmount },
    { label: "Reconciled", group: totals.matchedAmount },
    { label: "To reconcile", group: totals.remainingAmount },
  ];
}

/** Same metrics as the costs list caption / timeline bulk bar. */
export function getCostViewTotalsStripRows(
  totals: CostView["total"],
): TotalsSummaryStripRow[] {
  return [
    { label: "Net total", group: totals.netAmount },
    { label: "Total matched", group: totals.matchedAmount },
    { label: "Total remaining", group: totals.remainingAmount },
  ];
}

export function TotalsSummaryStrip(props: {
  rows: TotalsSummaryStripRow[];
  formatContext: TotalsSummaryStripFormatContext;
  /** Merged after `w-full` (pass extra layout/gap utilities as needed). */
  summaryClassName?: string;
}) {
  return (
    <Summary
      variant="strip"
      className={cn("w-full", props.summaryClassName)}
    >
      {props.rows.map((item) => (
        <SummaryCurrencyGroup
          key={item.label}
          label={item.label}
          description={item.description}
          group={item.group}
          services={props.formatContext}
          variant="strip"
        />
      ))}
    </Summary>
  );
}
