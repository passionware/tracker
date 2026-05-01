"use client";

import type { Billing } from "@/api/billing/billing.api.ts";
import { LinkValidation, ReportDisplay } from "@/api/reports/reports.api.ts";
import { Button } from "@/components/ui/button.tsx";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { cn } from "@/lib/utils.ts";
import type { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { maybe } from "@passionware/monads";
import { ListOrdered } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

function formatPlainDecimal(n: number, maxDecimals = 6): string {
  if (!Number.isFinite(n)) return "";
  const s = n.toFixed(maxDecimals);
  return s.replace(/\.?0+$/, "") || "0";
}

function deriveBillingInvoicePosition(
  row: Billing["linkBillingReport"][number],
): {
  unitLabel: string;
  hours: number | null;
  rate: number | null;
  sum: number;
} | null {
  if (row.link.linkType !== "reconcile" || !row.report) return null;
  const link = row.link;
  if (!maybe.isPresent(link.billingAmount)) return null;
  const sum = link.billingAmount;

  if (LinkValidation.hasDetailedBillingBreakdown(link) && link.breakdown) {
    const b = link.breakdown;
    return {
      unitLabel: ReportDisplay.formatUnit(b.unit),
      hours: b.quantity,
      rate: b.billingUnitPrice,
      sum,
    };
  }

  const qty = row.report.quantity;
  if (qty != null && qty > 0 && Number.isFinite(qty)) {
    return {
      unitLabel: row.report.unit
        ? ReportDisplay.formatUnit(row.report.unit)
        : "",
      hours: qty,
      rate: sum / qty,
      sum,
    };
  }

  return {
    unitLabel: "",
    hours: null,
    rate: null,
    sum,
  };
}

function CopyableNumber({
  copyText,
  display,
  ariaLabel,
  align = "right",
}: {
  copyText: string;
  display: ReactNode;
  ariaLabel: string;
  align?: "left" | "right";
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      title="Click to copy"
      aria-label={ariaLabel}
      data-vaul-no-drag=""
      className={cn(
        "h-auto min-h-8 max-w-full rounded-md px-2 py-1 font-mono text-sm font-normal tabular-nums text-foreground",
        "border border-transparent hover:border-border hover:bg-muted/50",
        align === "right"
          ? "justify-end text-right"
          : "justify-start text-left",
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void navigator.clipboard.writeText(copyText);
        toast.success("Copied");
      }}
    >
      <span className="min-w-0 truncate">{display}</span>
    </Button>
  );
}

function InvoicePositionRow({
  row,
  billingCurrency,
  services,
  onOpenReportDetails,
}: {
  row: Billing["linkBillingReport"][number];
  billingCurrency: string;
  services: DrawerDescriptorServices;
  onOpenReportDetails?: (reportId: number) => void;
}) {
  const report = row.report;
  const metrics = deriveBillingInvoicePosition(row);
  if (!report || !metrics) return null;

  const hoursLabel = metrics.unitLabel
    ? `Hours (${metrics.unitLabel})`
    : "Hours";
  const rateLabel = metrics.unitLabel
    ? `Rate (${billingCurrency}/${metrics.unitLabel})`
    : `Rate (${billingCurrency})`;

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0">
      <button
        type="button"
        className={cn(
          "min-w-0 rounded-md text-left outline-none transition-colors",
          onOpenReportDetails &&
            "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        disabled={!onOpenReportDetails}
        onClick={() => onOpenReportDetails?.(report.id)}
      >
        <span className="pointer-events-none block min-w-0">
          <ContractorWidget
            contractorId={report.contractorId}
            services={services}
            layout="full"
          />
        </span>
      </button>

      <div className="flex justify-end">
        {metrics.hours != null ? (
          <CopyableNumber
            copyText={formatPlainDecimal(metrics.hours)}
            ariaLabel={`Copy ${hoursLabel}`}
            display={
              <span>
                {formatPlainDecimal(metrics.hours)}
                {metrics.unitLabel ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {metrics.unitLabel}
                  </span>
                ) : null}
              </span>
            }
          />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex justify-end">
        {metrics.rate != null ? (
          <CopyableNumber
            copyText={formatPlainDecimal(metrics.rate)}
            ariaLabel={`Copy ${rateLabel}`}
            display={
              <span className="inline-flex min-w-0 flex-col items-end gap-0.5">
                <span>{formatPlainDecimal(metrics.rate)}</span>
                <span className="text-[10px] font-normal leading-none text-muted-foreground">
                  {billingCurrency}
                  {metrics.unitLabel ? `/${metrics.unitLabel}` : ""}
                </span>
              </span>
            }
          />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex justify-end">
        <CopyableNumber
          copyText={formatPlainDecimal(metrics.sum)}
          ariaLabel="Copy line total (amount)"
          display={
            <span className="font-mono">
              {services.formatService.financial.amountText(
                metrics.sum,
                billingCurrency,
              )}
            </span>
          }
        />
      </div>
    </div>
  );
}

export interface BillingInvoicePositionsProps {
  billing: BillingViewEntry;
  services: DrawerDescriptorServices;
  onOpenReportDetails?: (reportId: number) => void;
}

export function BillingInvoicePositions({
  billing,
  services,
  onOpenReportDetails,
}: BillingInvoicePositionsProps) {
  const rows = billing.links.filter(
    (x) =>
      x.link.linkType === "reconcile" &&
      x.report != null &&
      maybe.isPresent(x.link.billingAmount),
  );

  const billingCurrency = billing.netAmount.currency;

  return (
    <section className="space-y-0" aria-label="Invoice positions">
      <PanelSectionLabel icon={ListOrdered}>
        Invoice positions
      </PanelSectionLabel>
      <SurfaceCard className="select-text" data-vaul-no-drag="">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No report-linked lines on this invoice yet.
          </p>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Contractor</span>
              <span className="text-right">Hours</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Line total</span>
            </div>
            <div className="-mx-1">
              {rows.map((row) => (
                <InvoicePositionRow
                  key={row.link.id}
                  row={row}
                  billingCurrency={billingCurrency}
                  services={services}
                  onOpenReportDetails={onOpenReportDetails}
                />
              ))}
            </div>
          </>
        )}
      </SurfaceCard>
    </section>
  );
}
