"use client";

import { LinkValidation, ReportDisplay } from "@/api/reports/reports.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import {
  billingInvoiceRateGroupKey,
  buildBillingInvoicePositionLines,
  formatPlainDecimal,
  type BillingInvoicePositionLine,
  type BillingInvoicePositionRow,
} from "@/features/billing/billingInvoicePositionsUtils.ts";
import { useBillingInvoicePositionsProjectId } from "@/features/billing/useBillingInvoicePositionsProjectId.ts";
import { cn } from "@/lib/utils.ts";
import type { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { maybe, rd } from "@passionware/monads";
import { Copy, ListOrdered } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function deriveBillingInvoicePosition(
  row: BillingInvoicePositionRow,
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

function CopyableValue({
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
      disabled={!copyText}
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

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
  toast.success("Copied");
}

function ContractorCopyableCell({
  contractorId,
  services,
  contractorNamesById,
}: {
  contractorId: number;
  services: DrawerDescriptorServices;
  contractorNamesById: ReadonlyMap<number, string>;
}) {
  const contractor = services.contractorService.useContractor(contractorId);
  const copyText =
    contractorNamesById.get(contractorId) ??
    rd.tryMap(contractor, (c) => c.fullName.trim()) ??
    "";

  return (
    <CopyableValue
      align="left"
      copyText={copyText}
      ariaLabel="Copy contractor name"
      display={
        <ContractorWidget
          contractorId={contractorId}
          services={services}
          layout="full"
        />
      }
    />
  );
}

function RateGroupNameCell({
  rateKey,
  defaultName,
  storedName,
  onSaveName,
}: {
  rateKey: string;
  defaultName: string;
  storedName: string;
  onSaveName: (rateKey: string, name: string) => void;
}) {
  const [draft, setDraft] = useState(storedName);
  useEffect(() => {
    setDraft(storedName);
  }, [storedName]);

  const displayName = draft.trim() || defaultName;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== storedName) {
            onSaveName(rateKey, draft);
          }
        }}
        placeholder={defaultName}
        aria-label="Custom name for this rate group"
        data-vaul-no-drag=""
        className="h-8 min-w-0 flex-1 text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        title="Copy group name"
        aria-label="Copy group name"
        data-vaul-no-drag=""
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard(displayName);
        }}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

function aggregateGroupMetrics(rows: BillingInvoicePositionRow[]) {
  let sumAmount = 0;
  let sumHours = 0;
  let unitLabel = "";
  let rate: number | null = null;
  let linesWithHours = 0;

  for (const row of rows) {
    const m = deriveBillingInvoicePosition(row);
    if (!m) continue;
    sumAmount += m.sum;
    if (m.hours != null) {
      sumHours += m.hours;
      linesWithHours += 1;
    }
    if (rate == null && m.rate != null) {
      rate = m.rate;
      unitLabel = m.unitLabel;
    }
  }

  return {
    sumAmount,
    sumHours: linesWithHours > 0 ? sumHours : null,
    rate,
    unitLabel,
    linesWithHours,
  };
}

function buildDefaultRateGroupName(
  rows: BillingInvoicePositionRow[],
  contractorNamesById: ReadonlyMap<number, string>,
): string {
  const names: string[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    const contractorId = row.report?.contractorId;
    if (contractorId == null || seen.has(contractorId)) continue;
    seen.add(contractorId);
    const name = contractorNamesById.get(contractorId);
    if (name) names.push(name);
  }
  return names.join(", ");
}

function InvoicePositionMetricsCells({
  metrics,
  billingCurrency,
  services,
}: {
  metrics: {
    unitLabel: string;
    hours: number | null;
    rate: number | null;
    sum: number;
  };
  billingCurrency: string;
  services: DrawerDescriptorServices;
}) {
  const hoursLabel = metrics.unitLabel
    ? `Hours (${metrics.unitLabel})`
    : "Hours";
  const rateLabel = metrics.unitLabel
    ? `Rate (${billingCurrency}/${metrics.unitLabel})`
    : `Rate (${billingCurrency})`;

  return (
    <>
      <div className="flex justify-end">
        {metrics.hours != null ? (
          <CopyableValue
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
          <CopyableValue
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
        <CopyableValue
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
    </>
  );
}

function InvoicePositionRowView({
  line,
  billingCurrency,
  services,
  rateGroupNames,
  contractorNamesById,
  onSaveRateGroupName,
}: {
  line: BillingInvoicePositionLine;
  billingCurrency: string;
  services: DrawerDescriptorServices;
  rateGroupNames: Record<string, string>;
  contractorNamesById: ReadonlyMap<number, string>;
  onSaveRateGroupName: (rateKey: string, name: string) => void;
}) {
  if (line.kind === "single") {
    const report = line.row.report;
    const metrics = deriveBillingInvoicePosition(line.row);
    if (!report || !metrics) return null;

    return (
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0">
        <ContractorCopyableCell
          contractorId={report.contractorId}
          services={services}
          contractorNamesById={contractorNamesById}
        />
        <InvoicePositionMetricsCells
          metrics={{
            unitLabel: metrics.unitLabel,
            hours: metrics.hours,
            rate: metrics.rate,
            sum: metrics.sum,
          }}
          billingCurrency={billingCurrency}
          services={services}
        />
      </div>
    );
  }

  const groupMetrics = aggregateGroupMetrics(line.rows);
  const defaultName = buildDefaultRateGroupName(line.rows, contractorNamesById);

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0">
      <RateGroupNameCell
        rateKey={line.rateKey}
        defaultName={defaultName}
        storedName={rateGroupNames[line.rateKey] ?? ""}
        onSaveName={onSaveRateGroupName}
      />
      <InvoicePositionMetricsCells
        metrics={{
          unitLabel: groupMetrics.unitLabel,
          hours: groupMetrics.sumHours,
          rate: groupMetrics.rate,
          sum: groupMetrics.sumAmount,
        }}
        billingCurrency={billingCurrency}
        services={services}
      />
    </div>
  );
}

export interface BillingInvoicePositionsProps {
  billing: BillingViewEntry;
  services: DrawerDescriptorServices;
  /** When known (e.g. iteration billing), used for per-project preference scope. */
  projectId?: number;
}

export function BillingInvoicePositions({
  billing,
  services,
  projectId: explicitProjectId,
}: BillingInvoicePositionsProps) {
  const rows = billing.links.filter(
    (x) =>
      x.link.linkType === "reconcile" &&
      x.report != null &&
      maybe.isPresent(x.link.billingAmount),
  );

  const projectId = useBillingInvoicePositionsProjectId(
    rows,
    services,
    explicitProjectId,
  );

  const prefs =
    services.preferenceService.useBillingInvoicePositionsPreferences(projectId);

  const [localGroupByRate, setLocalGroupByRate] = useState(prefs.groupByRate);
  const groupByRate =
    projectId != null ? prefs.groupByRate : localGroupByRate;

  const contractorNamesById = useMemo(() => {
    const map = new Map<number, string>();
    for (const contractor of billing.contractors) {
      const name = contractor.fullName.trim();
      if (name) map.set(contractor.id, name);
    }
    return map;
  }, [billing.contractors]);

  const getRateKey = useCallback((row: BillingInvoicePositionRow) => {
    const metrics = deriveBillingInvoicePosition(row);
    if (metrics?.rate == null || !Number.isFinite(metrics.rate)) {
      return null;
    }
    return billingInvoiceRateGroupKey(metrics.rate, metrics.unitLabel);
  }, []);

  const displayLines = useMemo(
    () => buildBillingInvoicePositionLines(rows, groupByRate, getRateKey),
    [rows, groupByRate, getRateKey],
  );

  const handleGroupByRateChange = useCallback(
    (checked: boolean) => {
      if (projectId != null) {
        void services.preferenceService.setBillingInvoicePositionsPreferences(
          projectId,
          { groupByRate: checked },
        );
      } else {
        setLocalGroupByRate(checked);
      }
    },
    [projectId, services.preferenceService],
  );

  const handleSaveRateGroupName = useCallback(
    (rateKey: string, name: string) => {
      if (projectId == null) return;
      void services.preferenceService.setBillingInvoicePositionsPreferences(
        projectId,
        {
          rateGroupNames: { [rateKey]: name },
        },
      );
    },
    [projectId, services.preferenceService],
  );

  const billingCurrency = billing.netAmount.currency;

  const invoiceNumberLabel =
    (billing.invoiceNumber && billing.invoiceNumber.trim()) ||
    `#${billing.id}`;

  const dueDateDisplay =
    billing.dueDate == null
      ? "—"
      : services.formatService.temporal.single.compact(billing.dueDate);

  const totals = useMemo(() => {
    let sumAmount = 0;
    let sumHours = 0;
    let linesWithHours = 0;
    for (const row of rows) {
      const m = deriveBillingInvoicePosition(row);
      if (!m) continue;
      sumAmount += m.sum;
      if (m.hours != null) {
        sumHours += m.hours;
        linesWithHours += 1;
      }
    }
    const partialHours =
      linesWithHours > 0 && linesWithHours < rows.length;
    return { sumAmount, sumHours, linesWithHours, partialHours };
  }, [rows]);

  return (
    <section className="space-y-0" aria-label="Invoice positions">
      <PanelSectionLabel icon={ListOrdered}>
        Invoice positions
      </PanelSectionLabel>
      <SurfaceCard className="select-text overflow-hidden p-0" data-vaul-no-drag="">
        <div className="border-b border-border bg-muted/30 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Invoice no.
              </p>
              <p className="font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {invoiceNumberLabel}
              </p>
            </div>
            <div className="shrink-0 space-y-1 sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Due date
              </p>
              <div className="text-base font-medium tabular-nums text-foreground sm:text-lg">
                {dueDateDisplay}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No report-linked lines on this invoice yet.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="billing-invoice-positions-group-by-rate"
                    checked={groupByRate}
                    onCheckedChange={handleGroupByRateChange}
                    data-vaul-no-drag=""
                  />
                  <Label
                    htmlFor="billing-invoice-positions-group-by-rate"
                    className="cursor-pointer text-sm font-normal text-foreground"
                  >
                    Group lines with the same rate
                  </Label>
                </div>
                {projectId == null ? (
                  <p className="text-xs text-muted-foreground">
                    Preferences save per project when all lines belong to one
                    project.
                  </p>
                ) : null}
              </div>

              <div className="mb-2 grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{groupByRate ? "Name" : "Contractor"}</span>
                <span className="text-right">Hours</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Line total</span>
              </div>
              <div className="-mx-1">
                {displayLines.map((line) => (
                  <InvoicePositionRowView
                    key={
                      line.kind === "single"
                        ? line.row.link.id
                        : `group-${line.rateKey}`
                    }
                    line={line}
                    billingCurrency={billingCurrency}
                    services={services}
                    rateGroupNames={prefs.rateGroupNames}
                    contractorNamesById={contractorNamesById}
                    onSaveRateGroupName={handleSaveRateGroupName}
                  />
                ))}
              </div>
              <div
                className="mt-3 grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-t border-border pt-3"
                aria-label="Invoice positions totals"
              >
                <span className="self-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <div className="flex justify-end">
                  {totals.linesWithHours === 0 ? (
                    <span className="self-center text-sm text-muted-foreground">
                      —
                    </span>
                  ) : (
                    <CopyableValue
                      copyText={formatPlainDecimal(totals.sumHours)}
                      ariaLabel="Copy total hours"
                      display={
                        <span className="inline-flex flex-col items-end gap-0.5 font-semibold text-foreground">
                          <span>{formatPlainDecimal(totals.sumHours)}</span>
                          {totals.partialHours ? (
                            <span className="text-[10px] font-normal leading-none text-muted-foreground">
                              {totals.linesWithHours}/{rows.length} lines
                            </span>
                          ) : null}
                        </span>
                      }
                    />
                  )}
                </div>
                <span className="self-center text-right text-sm text-muted-foreground">
                  —
                </span>
                <div className="flex justify-end">
                  <CopyableValue
                    copyText={formatPlainDecimal(totals.sumAmount)}
                    ariaLabel="Copy total linked billing amount"
                    display={
                      <span className="font-mono font-semibold text-foreground">
                        {services.formatService.financial.amountText(
                          totals.sumAmount,
                          billingCurrency,
                        )}
                      </span>
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </SurfaceCard>
    </section>
  );
}
