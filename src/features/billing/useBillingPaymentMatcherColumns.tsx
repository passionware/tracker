import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import type { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { billingMatcherColumnHelper } from "@/features/billing/billingMatcher.columnHelper.ts";
import type { BillingMatcherDraftMatch } from "@/features/billing/billingMatcher.types.ts";
import {
  BillingMatcherRowEditPopover,
  ExistingPaidHint,
  MatcherDateField,
} from "@/features/billing/BillingMatcherRowEditPopover.tsx";
import {
  confidenceBadgeProps,
  MATCHER_READ_ONLY_BOX,
  paymentLagHint,
} from "@/features/billing/billingMatcherUtils.ts";
import { cn } from "@/lib/utils.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type { CalendarDate } from "@internationalized/date";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

export function useBillingPaymentMatcherColumns(args: {
  billingById: Map<number, BillingViewEntry>;
  defaultCurrency: string;
  formatDate: (d: CalendarDate) => string;
  services: BillingWidgetProps["services"];
  unmatchedPaymentHints: string[];
  setMatches: Dispatch<SetStateAction<BillingMatcherDraftMatch[]>>;
}): ColumnDef<BillingMatcherDraftMatch>[] {
  const {
    billingById,
    defaultCurrency,
    formatDate,
    services,
    unmatchedPaymentHints,
    setMatches,
  } = args;

  return useMemo(
    () => [
      billingMatcherColumnHelper.display({
        id: "invoiceData",
        header: "Invoice data",
        meta: {
          headerClassName:
            "!text-left align-bottom whitespace-nowrap font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[10%] min-w-0",
          cellClassName: "align-top w-[10%] min-w-0",
        },
        cell: (info) => {
          const row = info.row.original;
          const b = billingById.get(row.billingId);
          return (
            <div className="flex min-w-0 flex-col gap-2" data-no-row-open>
              {b ? (
                <div className={MATCHER_READ_ONLY_BOX}>
                  <MatcherDateField label="Invoice date">
                    <span className="tabular-nums text-sm leading-none text-foreground">
                      {formatDate(b.invoiceDate)}
                    </span>
                  </MatcherDateField>
                  <MatcherDateField label="Payment due">
                    <span className="tabular-nums text-sm leading-none text-foreground">
                      {b.dueDate ? formatDate(b.dueDate) : "—"}
                    </span>
                  </MatcherDateField>
                  {b.client.name?.trim() ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {b.client.name.trim()}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className={MATCHER_READ_ONLY_BOX}>
                  <span className="text-xs text-muted-foreground">—</span>
                </div>
              )}
              <ExistingPaidHint
                entry={b}
                suggestedPaidAt={row.paidAt}
                formatDate={formatDate}
              />
            </div>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "paymentDate",
        header: "Payment date",
        meta: {
          headerClassName:
            "!text-left align-bottom font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[10%] min-w-0",
          cellClassName: "align-top w-[10%] min-w-0",
        },
        cell: (info) => {
          const row = info.row.original;
          const b = billingById.get(row.billingId);
          const lagHint =
            b != null ? paymentLagHint(b.invoiceDate, row.paidAt) : null;
          return (
            <div className={MATCHER_READ_ONLY_BOX} data-no-row-open>
              <MatcherDateField label="Paid on">
                <span className="tabular-nums text-sm leading-none text-foreground">
                  {formatDate(row.paidAt)}
                </span>
              </MatcherDateField>
              {lagHint ? (
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  {lagHint}
                </p>
              ) : null}
            </div>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "invoiceNumber",
        header: "Invoice #",
        meta: {
          headerClassName:
            "!text-left align-bottom whitespace-nowrap font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[7%] min-w-0",
          cellClassName: "align-top w-[7%] min-w-0 whitespace-nowrap",
        },
        cell: (info) => {
          const row = info.row.original;
          const b = billingById.get(row.billingId);
          return (
            <div
              className="flex min-w-0 flex-col items-start gap-1.5"
              data-no-row-open
            >
              <span className="font-medium leading-none text-sm text-foreground">
                {b ? b.invoiceNumber : `#${row.billingId}`}
              </span>
              <Badge
                {...confidenceBadgeProps(row.confidence)}
                size="sm"
                className="shrink-0 font-normal text-[10px] uppercase"
              >
                {row.confidence}
              </Badge>
            </div>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "paymentTitle",
        header: "Payment title",
        meta: {
          headerClassName:
            "!text-left align-bottom font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[12%] min-w-0",
          cellClassName: "align-top w-[12%] min-w-0",
        },
        cell: (info) => {
          const row = info.row.original;
          const title = row.paymentTitle.trim();
          return (
            <div
              className="flex min-w-0 max-w-full flex-col gap-1"
              data-no-row-open
            >
              {title ? (
                <OverflowTooltip title={title} delayDuration={400}>
                  <span className="block w-full min-w-0 truncate text-sm font-medium leading-snug text-foreground">
                    {title}
                  </span>
                </OverflowTooltip>
              ) : row.paymentSummary ? (
                <OverflowTooltip title={row.paymentSummary} delayDuration={400}>
                  <span className="block w-full min-w-0 truncate text-xs italic leading-relaxed text-muted-foreground">
                    {row.paymentSummary}
                  </span>
                </OverflowTooltip>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
              {title && row.paymentSummary ? (
                <OverflowTooltip title={row.paymentSummary} delayDuration={400}>
                  <p className="min-w-0 max-w-full truncate text-[11px] leading-relaxed text-muted-foreground/90">
                    {row.paymentSummary}
                  </p>
                </OverflowTooltip>
              ) : null}
            </div>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "invoiceAmount",
        header: "Invoice amount",
        meta: {
          headerClassName:
            "!text-left align-bottom font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[8%] min-w-0",
          cellClassName:
            "align-top w-[8%] min-w-0 tabular-nums whitespace-nowrap",
        },
        cell: (info) => {
          const row = info.row.original;
          const b = billingById.get(row.billingId);
          return (
            <span className="text-sm text-foreground" data-no-row-open>
              {b
                ? services.formatService.financial.amountText(
                    b.grossAmount.amount,
                    b.grossAmount.currency,
                  )
                : "—"}
            </span>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "paymentAmount",
        header: "Payment amount",
        meta: {
          headerClassName:
            "!text-left align-bottom font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[8%] min-w-0",
          cellClassName:
            "align-top w-[8%] min-w-0 tabular-nums whitespace-nowrap",
        },
        cell: (info) => {
          const row = info.row.original;
          const b = billingById.get(row.billingId);
          const currency = b?.grossAmount.currency ?? defaultCurrency;
          return (
            <span className="text-sm text-foreground" data-no-row-open>
              {row.paymentAmount != null
                ? services.formatService.financial.amountText(
                    row.paymentAmount,
                    currency,
                  )
                : "—"}
            </span>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "note",
        header: "Note",
        meta: {
          headerClassName:
            "!text-left align-bottom font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[40%] min-w-0",
          cellClassName: "align-top w-[40%] min-w-0",
        },
        cell: (info) => {
          const row = info.row.original;
          const text = row.justification.trim();
          return (
            <div
              className={cn(MATCHER_READ_ONLY_BOX, "min-w-0")}
              data-no-row-open
            >
              {text ? (
                <OverflowTooltip title={row.justification} delayDuration={400}>
                  <p className="line-clamp-6 text-xs leading-relaxed text-foreground">
                    {row.justification}
                  </p>
                </OverflowTooltip>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      }),
      billingMatcherColumnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: {
          headerClassName:
            "!text-right align-bottom font-semibold text-[11px] uppercase tracking-wide text-muted-foreground w-[5%] min-w-[4.5rem]",
          cellClassName: "w-[5%] min-w-[4.5rem] align-top text-right",
        },
        cell: (info) => {
          const row = info.row.original;
          const b = billingById.get(row.billingId);
          return (
            <div
              className="flex min-w-0 flex-col items-end gap-0.5"
              data-no-row-open
            >
              <BillingMatcherRowEditPopover
                row={row}
                billing={b}
                unmatchedPaymentHints={unmatchedPaymentHints}
                onPatch={(patch) =>
                  setMatches((prev) =>
                    prev.map((x) =>
                      x.key === row.key ? { ...x, ...patch } : x,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                data-no-row-open
                onClick={() =>
                  setMatches((prev) => prev.filter((x) => x.key !== row.key))
                }
              >
                Remove
              </Button>
            </div>
          );
        },
      }),
    ],
    [
      billingById,
      defaultCurrency,
      formatDate,
      services,
      setMatches,
      unmatchedPaymentHints,
    ],
  );
}
