import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import { Input, NumberInput, NumberInputAsString } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { todayCalendarDate } from "@/platform/lang/internationalized-date";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { CostPayload } from "@/api/cost/cost.api.ts";
import { AlertTriangle } from "lucide-react";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type LinkDraft = {
  reportId: number;
  reportDescription: string;
  reportCurrency: string;
  maxReportAmount: number;
  reportAmount: number;
  costAmount: number;
  exchangeRate: number;
  isManualRate: boolean;
  isIncluded: boolean;
  unit: string | null;
  unitPrice: number | null;
};

type CostDraftSnapshot = Partial<CostPayload>;

export interface BulkCreateCostDrawerProps
  extends WithServices<
    [
      WithMutationService,
      WithFormatService,
      WithExchangeService,
      WithWorkspaceService,
      WithContractorService,
      WithClientService,
    ]
  > {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReports: ReportViewEntry[];
  onCompleted: () => void;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const toRateKey = (from: string, to: string) => `${from}->${to}`;

export function BulkCreateCostDrawer({
  services,
  open,
  onOpenChange,
  selectedReports,
  onCompleted,
}: BulkCreateCostDrawerProps) {
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [costDraft, setCostDraft] = useState<CostDraftSnapshot>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    const defaultCurrency =
      selectedReports[0]?.remainingCompensationAmount.currency ?? "EUR";
    setLinks(
      selectedReports.map((report) => {
        const reportAmount = Math.max(report.remainingCompensationAmount.amount, 0);
        return {
          reportId: report.id,
          reportDescription: report.description,
          reportCurrency: report.remainingCompensationAmount.currency,
          maxReportAmount: reportAmount,
          reportAmount,
          costAmount:
            report.remainingCompensationAmount.currency === defaultCurrency
              ? reportAmount
              : reportAmount,
          exchangeRate: 1,
          isManualRate: false,
          isIncluded: true,
          unit: report.originalReport.unit ?? null,
          unitPrice: report.originalReport.unitPrice ?? null,
        };
      }),
    );

    const contractorIds = new Set(selectedReports.map((x) => x.contractor.id));
    const contractorId = contractorIds.size === 1 ? selectedReports[0]?.contractor.id : null;

    const initialTotal = round2(
      selectedReports.reduce(
        (sum, report) => sum + Math.max(report.remainingCompensationAmount.amount, 0),
        0,
      ),
    );

    setCostDraft({
      workspaceId: selectedReports[0]?.workspace.id,
      contractorId,
      currency: defaultCurrency,
      netValue: initialTotal,
      grossValue: initialTotal,
      invoiceDate: todayCalendarDate(),
    });
  }, [open, selectedReports]);

  const costCurrency = costDraft.currency ?? links[0]?.reportCurrency ?? "EUR";

  const exchangeSpec = useMemo(() => {
    const uniquePairs = new Map<string, { from: string; to: string }>();
    for (const link of links) {
      if (link.reportCurrency === costCurrency) {
        continue;
      }
      uniquePairs.set(toRateKey(link.reportCurrency, costCurrency), {
        from: link.reportCurrency,
        to: costCurrency,
      });
    }
    return Array.from(uniquePairs.values());
  }, [costCurrency, links]);

  const rates = services.exchangeService.useExchangeRates(exchangeSpec);
  const resolvedRates = rd.tryGet(rates);
  const rateMap = useMemo(
    () =>
      new Map(
        (resolvedRates ?? []).map((x) => [toRateKey(x.from, x.to), x.rate]),
      ),
    [resolvedRates],
  );

  const effectiveLinks = useMemo(
    () =>
      links.map((link) => {
        const exchangeRate =
          link.reportCurrency === costCurrency
            ? 1
            : link.isManualRate
              ? link.exchangeRate
              : (rateMap.get(toRateKey(link.reportCurrency, costCurrency)) ??
                link.exchangeRate);
        const costAmount = round2(link.reportAmount * exchangeRate);
        return {
          ...link,
          exchangeRate,
          costAmount,
        };
      }),
    [costCurrency, links, rateMap],
  );
  const includedLinks = useMemo(
    () => effectiveLinks.filter((link) => link.isIncluded),
    [effectiveLinks],
  );

  const linksTotalCost = useMemo(
    () => round2(includedLinks.reduce((sum, link) => sum + link.costAmount, 0)),
    [includedLinks],
  );
  const hasZeroLink = useMemo(
    () => includedLinks.some((link) => link.reportAmount <= 0 || link.costAmount <= 0),
    [includedLinks],
  );

  const desiredCostAmount = costDraft.netValue ?? linksTotalCost;
  const totalDifference = round2(desiredCostAmount - linksTotalCost);
  const isMismatched = Math.abs(totalDifference) >= 0.01;

  const saveMutation = promiseState.useMutation(async (payload: CostPayload) => {
    const selectedLinks = includedLinks.filter(
      (link) => link.reportAmount > 0 && link.costAmount > 0,
    );

    if (selectedLinks.length === 0) {
      throw new Error("No report links selected.");
    }

    const createdCost = await services.mutationService.createCost(payload);

    for (const link of selectedLinks) {
      const quantity =
        link.unitPrice && link.unitPrice > 0
          ? round2(link.reportAmount / link.unitPrice)
          : undefined;
      const costUnitPrice =
        quantity && quantity > 0 ? round2(link.costAmount / quantity) : undefined;

      await services.mutationService.linkCostAndReport({
        costId: createdCost.id,
        reportId: link.reportId,
        costAmount: round2(link.costAmount),
        reportAmount: round2(link.reportAmount),
        description: `Bulk link for report #${link.reportId}`,
        breakdown:
          quantity && costUnitPrice && link.unit
            ? {
                quantity,
                unit: link.unit,
                reportUnitPrice: link.unitPrice ?? 0,
                costUnitPrice,
                exchangeRate: link.exchangeRate,
                reportCurrency: link.reportCurrency,
                costCurrency,
              }
            : undefined,
      });
    }

    toast.success(
      `Created cost and linked ${selectedLinks.length} report${selectedLinks.length > 1 ? "s" : ""}.`,
    );
    onCompleted();
    onOpenChange(false);
  });

  function updateLink(reportId: number, patch: Partial<LinkDraft>) {
    setLinks((current) =>
      current.map((link) => (link.reportId === reportId ? { ...link, ...patch } : link)),
    );
  }

  function reduceLinkToFit(reportId: number) {
    if (totalDifference >= 0) {
      return;
    }
    const overBy = Math.abs(totalDifference);
    setLinks((current) =>
      current.map((link) => {
        if (link.reportId !== reportId) {
          return link;
        }
        const currentRate =
          link.reportCurrency === costCurrency
            ? 1
            : link.isManualRate
              ? link.exchangeRate
              : (rateMap.get(toRateKey(link.reportCurrency, costCurrency)) ??
                link.exchangeRate);
        const currentCostAmount = round2(link.reportAmount * currentRate);
        const reduction = Math.min(overBy, currentCostAmount);
        const costAmount = round2(currentCostAmount - reduction);
        const reportAmount =
          currentRate > 0
            ? round2(costAmount / currentRate)
            : link.reportAmount;
        return {
          ...link,
          costAmount,
          reportAmount,
        };
      }),
    );
  }

  async function handleSave() {
    if (hasZeroLink) {
      toast.error(
        "Zero-value mapping is not allowed. Set positive report and cost amounts for each row.",
      );
      return;
    }
    if (isMismatched) {
      toast.error("Links total must match the final cost amount before saving.");
      return;
    }
    if (!costDraft.workspaceId) {
      toast.error("Workspace is required.");
      return;
    }
    if (!costDraft.currency) {
      toast.error("Currency is required.");
      return;
    }
    if (!costDraft.invoiceDate) {
      toast.error("Invoice date is required.");
      return;
    }
    if (!Number.isFinite(costDraft.netValue ?? NaN)) {
      toast.error("Net value is required.");
      return;
    }
    if (!Number.isFinite(costDraft.grossValue ?? NaN)) {
      toast.error("Gross value is required.");
      return;
    }
    if (!costDraft.invoiceNumber) {
      toast.error("Invoice number is required.");
      return;
    }

    await saveMutation.track({
      workspaceId: costDraft.workspaceId,
      contractorId: costDraft.contractorId ?? null,
      counterparty: costDraft.counterparty ?? "",
      currency: costDraft.currency,
      netValue: costDraft.netValue ?? 0,
      grossValue: costDraft.grossValue ?? 0,
      invoiceNumber: costDraft.invoiceNumber,
      invoiceDate: costDraft.invoiceDate,
      description: costDraft.description ?? "",
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-none border-l border-border mt-0">
        <DrawerHeader>
          <DrawerTitle>Create cost for selected invoices</DrawerTitle>
          <DrawerDescription>
            Create one cost and map selected reports to cost links in one step.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-4">
          {resolvedRates === undefined && exchangeSpec.length > 0 ? (
            <div className="text-sm text-muted-foreground py-8">
              Loading exchange rates...
            </div>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-4 min-w-[20rem]">
            <div>
              <div className="text-sm font-medium mb-1">Workspace</div>
              <WorkspacePicker
                value={costDraft.workspaceId ?? null}
                onSelect={(workspaceId) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    workspaceId:
                      typeof workspaceId === "number" ? workspaceId : undefined,
                  }))
                }
                services={services}
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Contractor</div>
              <ContractorPicker
                allowClear
                value={costDraft.contractorId ?? null}
                onSelect={(contractorId) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    contractorId:
                      typeof contractorId === "number" ? contractorId : null,
                  }))
                }
                services={services}
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Counterparty</div>
              <Input
                value={costDraft.counterparty ?? ""}
                onChange={(event) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    counterparty: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Currency</div>
              <CurrencyPicker
                value={costDraft.currency ?? null}
                onSelect={(currency) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    currency: currency ?? undefined,
                  }))
                }
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Net Value</div>
              <NumberInputAsString
                value={
                  Number.isFinite(costDraft.netValue ?? NaN)
                    ? String(costDraft.netValue)
                    : ""
                }
                onChange={(value) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    netValue: Number.parseFloat(value),
                  }))
                }
                step={0.01}
                formatOptions={{
                  ...(costDraft.currency
                    ? {
                        style: "currency",
                        currency: costDraft.currency,
                      }
                    : {}),
                }}
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Gross Value</div>
              <NumberInputAsString
                value={
                  Number.isFinite(costDraft.grossValue ?? NaN)
                    ? String(costDraft.grossValue)
                    : ""
                }
                onChange={(value) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    grossValue: Number.parseFloat(value),
                  }))
                }
                step={0.01}
                formatOptions={{
                  ...(costDraft.currency
                    ? {
                        style: "currency",
                        currency: costDraft.currency,
                      }
                    : {}),
                }}
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Invoice Number</div>
              <Input
                value={costDraft.invoiceNumber ?? ""}
                onChange={(event) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    invoiceNumber: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Invoice Date</div>
              <DatePicker
                value={costDraft.invoiceDate ?? null}
                onChange={(invoiceDate) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    invoiceDate: invoiceDate ?? undefined,
                  }))
                }
              />
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium mb-1">Description</div>
              <Textarea
                value={costDraft.description ?? ""}
                onChange={(event) =>
                  setCostDraft((draft) => ({
                    ...draft,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Report to cost mapping</div>
            <div className="text-xs text-muted-foreground">
              Defaults use each report&apos;s <code>to pay</code> amount. Exchange rates
              are prefilled from the market and can be overridden per link.
            </div>
          </div>

          {effectiveLinks.map((link) => (
            <div
              key={link.reportId}
              className={[
                "rounded-md border border-border p-3 grid grid-cols-12 gap-2 items-end",
                !link.isIncluded ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="col-span-12 md:col-span-1 flex items-center gap-2">
                <Checkbox
                  checked={link.isIncluded}
                  onCheckedChange={(checked) =>
                    updateLink(link.reportId, { isIncluded: checked === true })
                  }
                  id={`include-link-${link.reportId}`}
                />
                <label
                  htmlFor={`include-link-${link.reportId}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Link
                </label>
              </div>
              <div className="col-span-12 md:col-span-3">
                <div className="text-xs text-muted-foreground">Report</div>
                <div className="text-sm font-medium truncate">
                  #{link.reportId} {link.reportDescription || "No description"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  To pay:{" "}
                  {services.formatService.financial.amount(
                    link.maxReportAmount,
                    link.reportCurrency,
                  )}{" "}
                  | Remaining:{" "}
                  {services.formatService.financial.amount(
                    round2(Math.max(link.maxReportAmount - link.reportAmount, 0)),
                    link.reportCurrency,
                  )}
                </div>
              </div>

              <div className="col-span-6 md:col-span-2">
                <div className="text-xs text-muted-foreground">Report amount</div>
                <NumberInput
                  value={link.reportAmount}
                  minValue={0}
                  maxValue={link.maxReportAmount}
                  isDisabled={!link.isIncluded}
                  onChange={(value) => {
                    const reportAmount = round2(value ?? 0);
                    updateLink(link.reportId, {
                      reportAmount,
                      costAmount: round2(reportAmount * link.exchangeRate),
                    });
                  }}
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <div className="text-xs text-muted-foreground">
                  Rate {link.reportCurrency}→{costCurrency}
                </div>
                <NumberInput
                  value={link.exchangeRate}
                  minValue={0}
                  step={0.0001}
                  isDisabled={!link.isIncluded}
                  onChange={(value) => {
                    const exchangeRate = round2(value ?? 0);
                    updateLink(link.reportId, {
                      exchangeRate,
                      isManualRate: true,
                      costAmount: round2(link.reportAmount * exchangeRate),
                    });
                  }}
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <div className="text-xs text-muted-foreground">
                  Cost amount ({costCurrency})
                </div>
                <NumberInput
                  value={link.costAmount}
                  minValue={0}
                  isDisabled={!link.isIncluded}
                  onChange={(value) => {
                    const costAmount = round2(value ?? 0);
                    updateLink(link.reportId, {
                      costAmount, // kept in draft; effective value is rate-derived
                      reportAmount:
                        link.exchangeRate > 0
                          ? round2(costAmount / link.exchangeRate)
                          : link.reportAmount,
                    });
                  }}
                />
              </div>

              <div className="col-span-6 md:col-span-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={totalDifference >= 0 || !link.isIncluded}
                  onClick={() => reduceLinkToFit(link.reportId)}
                >
                  Reduce to fit
                </Button>
              </div>
            </div>
          ))}

          {isMismatched && (
            <Alert variant="info">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Amount mismatch</AlertTitle>
              <AlertDescription>
                Links total is{" "}
                {services.formatService.financial.amount(linksTotalCost, costCurrency)}{" "}
                while cost net amount is{" "}
                {services.formatService.financial.amount(desiredCostAmount, costCurrency)}.
                Difference:{" "}
                {services.formatService.financial.amount(totalDifference, costCurrency)}.
              </AlertDescription>
            </Alert>
          )}
            </>
          )}
        </div>

        <DrawerFooter className="border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Links total</div>
            <div className="font-semibold">
              {services.formatService.financial.amount(linksTotalCost, costCurrency)}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={
                mt.isInProgress(saveMutation.state) || hasZeroLink || isMismatched
              }
            >
              {mt.isInProgress(saveMutation.state)
                ? "Saving..."
                : "Save cost and links"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
