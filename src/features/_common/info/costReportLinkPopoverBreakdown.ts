import type { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import type { ReportBase } from "@/api/reports/reports.api.ts";

const round4 = (value: number) => Math.round(value * 10000) / 10000;

export type LinkPopoverBreakdownInitial = {
  quantity?: number;
  unit?: string;
  sourceUnitPrice?: number;
  targetUnitPrice?: number;
  exchangeRate?: number;
  sourceCurrency?: string;
  targetCurrency?: string;
};

/**
 * Build LinkPopover breakdown for "Update linked report" on a cost row.
 * When report and cost currencies differ, sets exchange rate = costAmount / reportAmount
 * (report currency → cost currency), matching bulk link semantics.
 * Fills quantity / unit / unit prices from stored breakdown or from the report when possible.
 */
export function buildCostReportLinkPopoverInitialBreakdown(
  link: LinkCostReport,
  report: Pick<ReportBase, "currency" | "unit" | "quantity" | "unitPrice">,
  costCurrency: string,
): LinkPopoverBreakdownInitial | undefined {
  const rc = report.currency.toUpperCase();
  const cc = costCurrency.toUpperCase();
  const reportAmt = link.reportAmount;
  const costAmt = link.costAmount;
  const b = link.breakdown;

  if (rc === cc && !b) {
    return undefined;
  }

  const inferredRate =
    rc !== cc && reportAmt > 0 ? round4(costAmt / reportAmt) : 1;

  const quantity =
    b?.quantity != null && b.quantity > 0
      ? b.quantity
      : report.quantity != null && report.quantity > 0
        ? report.quantity
        : report.unitPrice != null &&
            report.unitPrice > 0 &&
            reportAmt > 0
          ? round4(reportAmt / report.unitPrice)
          : undefined;

  const unit = b?.unit ?? report.unit ?? "";

  const targetUnitPrice =
    b?.reportUnitPrice ??
    (quantity != null && quantity > 0
      ? round4(reportAmt / quantity)
      : report.unitPrice ?? undefined);

  const sourceUnitPrice =
    b?.costUnitPrice ??
    (quantity != null && quantity > 0 ? round4(costAmt / quantity) : undefined);

  const exchangeRate =
    rc === cc
      ? 1
      : inferredRate > 0
        ? inferredRate
        : b?.exchangeRate && b.exchangeRate > 0
          ? b.exchangeRate
          : 1;

  return {
    quantity,
    unit: unit || undefined,
    sourceUnitPrice,
    targetUnitPrice,
    exchangeRate,
    sourceCurrency: costCurrency,
    targetCurrency: report.currency,
  };
}
