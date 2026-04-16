/**
 * Hosts {@link BulkCreateCostPanel} (bulk create cost flow). The filename is legacy;
 * the panel is mounted inside the entity drawer stack via `bulk-create-cost-for-reports`.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover.tsx";
import { DrawerFooter } from "@/components/ui/drawer.tsx";
import {
  Input,
  NumberInput,
  NumberInputAsString,
} from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { todayCalendarDate } from "@/platform/lang/internationalized-date";
import { money } from "@/platform/lang/money.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import {
  grossFromNet,
  useCostDraftAmounts,
} from "@/features/reports/hooks/useCostDraftAmounts.ts";
import { CostPayload } from "@/api/cost/cost.api.ts";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DryRunEntry = {
  type: "create";
  entityType: "cost" | "linkCostReport";
  description: string;
  payload: unknown;
};

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

export interface BulkCreateCostPanelProps
  extends WithServices<
    [
      WithMutationService,
      WithFormatService,
      WithExchangeService,
      WithWorkspaceService,
      WithContractorService,
      WithClientService,
      WithPreferenceService,
    ]
  > {
  selectedReports: ReportViewEntry[];
  onCancel: () => void;
  onCompleted: (createdCostId: number) => void;
}

const round2 = money.round;

const toRateKey = (from: string, to: string) =>
  `${String(from).toUpperCase()}->${String(to).toUpperCase()}`;

function buildLinkBreakdownPayload(link: LinkDraft, costCurrency: string) {
  if (link.unitPrice && link.unitPrice > 0) {
    // Keep unit prices stable from the source report and exchange rate.
    const reportUnitPrice = round2(link.unitPrice);
    const costUnitPrice = round2(reportUnitPrice * link.exchangeRate);
    const quantity = reportUnitPrice > 0
      ? round2(link.reportAmount / reportUnitPrice)
      : 1;
    const safeQuantity = quantity > 0 ? quantity : 1;

    return {
      quantity: safeQuantity,
      unit: link.unit ?? "pc",
      reportUnitPrice,
      costUnitPrice,
      exchangeRate: link.exchangeRate,
      reportCurrency: link.reportCurrency,
      costCurrency,
    };
  }

  const safeQuantity = 1;
  const reportUnitPrice = round2(link.reportAmount);
  const costUnitPrice = round2(link.costAmount);

  return {
    quantity: safeQuantity,
    unit: link.unit ?? "pc",
    reportUnitPrice,
    costUnitPrice,
    exchangeRate: link.exchangeRate,
    reportCurrency: link.reportCurrency,
    costCurrency,
  };
}

/**
 * Scan all link mappings and collect every (from, to) currency pair needed for
 * conversion, deduplicated. Handles mixed report currencies and a single cost
 * currency (or any future per-link target). One entry per unique pair.
 * Currency codes are normalized to uppercase so rate lookups match the exchange API.
 */
function getUniqueRatePairsFromMappings(
  links: { reportCurrency: string }[],
  costCurrency: string,
): { from: string; to: string }[] {
  const pairs = new Map<string, { from: string; to: string }>();
  for (const link of links) {
    const from = String(link.reportCurrency).toUpperCase();
    const to = String(costCurrency).toUpperCase();
    if (from === to) continue;
    const key = toRateKey(from, to);
    if (!pairs.has(key)) {
      pairs.set(key, { from, to });
    }
  }
  return Array.from(pairs.values());
}

export function BulkCreateCostPanel({
  services,
  selectedReports,
  onCancel,
  onCompleted,
}: BulkCreateCostPanelProps) {
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [costDraft, setCostDraft] = useState<CostDraftSnapshot>({});
  const [dryRunPreviewOpen, setDryRunPreviewOpen] = useState(false);
  const [dryRunEntries, setDryRunEntries] = useState<DryRunEntry[]>([]);
  const [dryRunExpanded, setDryRunExpanded] = useState<Set<number>>(new Set());
  const [pendingCurrencyChange, setPendingCurrencyChange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  /** When user changes the global rate: update cost amount (report fixed) or report amount (cost fixed). Always report × rate = cost. */
  const [rateChangeUpdates, setRateChangeUpdates] = useState<
    "costAmount" | "reportAmount"
  >("costAmount");

  const bulkCreateCostPrefs =
    services.preferenceService.useBulkCreateCostPreferences();
  const deductionPercent = bulkCreateCostPrefs.paymentDeductionPercent;
  const setDeductionPercent = (value: number) => {
    void services.preferenceService.setBulkCreateCostPreferences({
      paymentDeductionPercent: Math.min(100, Math.max(0, value)),
    });
  };

  const vatPercent = bulkCreateCostPrefs.vatPercent;
  const setVatPercent = (value: number) => {
    void services.preferenceService.setBulkCreateCostPreferences({
      vatPercent: Math.min(100, Math.max(0, value)),
    });
  };

  const {
    vatPercentClamped,
    setNetValue,
    onNetValueChange,
    onGrossValueChange,
    onVatPercentInputChange,
  } = useCostDraftAmounts({
    vatPercent,
    setCostDraft,
    onVatPercentChange: setVatPercent,
  });

  const selectedReportsKey = selectedReports.map((r) => r.id).join(",");

  useEffect(() => {
    const defaultCurrency =
      selectedReports[0]?.remainingCompensationAmount.currency ?? "EUR";
    setLinks(
      selectedReports.map((report) => {
        const reportAmount = Math.max(
          report.remainingCompensationAmount.amount,
          0,
        );
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
    const contractorId =
      contractorIds.size === 1 ? selectedReports[0]?.contractor.id : null;

    const initialTotal = round2(
      selectedReports.reduce(
        (sum, report) =>
          sum + Math.max(report.remainingCompensationAmount.amount, 0),
        0,
      ),
    );

    const vat = Math.min(100, Math.max(0, bulkCreateCostPrefs.vatPercent));

    setCostDraft({
      workspaceId: selectedReports[0]?.workspace.id,
      contractorId,
      currency: defaultCurrency,
      netValue: initialTotal,
      grossValue: grossFromNet(initialTotal, vat),
      invoiceDate: todayCalendarDate(),
    });
    // bulkCreateCostPrefs.vatPercent read once per open/selection only (not when VAT pref changes mid-session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReportsKey, bulkCreateCostPrefs.vatPercent]);

  const costCurrency = costDraft.currency ?? links[0]?.reportCurrency ?? "EUR";

  const ratePairsFromMappings = useMemo(
    () => getUniqueRatePairsFromMappings(links, costCurrency),
    [links, costCurrency],
  );

  const rates = services.exchangeService.useExchangeRates(
    ratePairsFromMappings,
  );
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
        const reportCc = String(link.reportCurrency).toUpperCase();
        const costCc = String(costCurrency).toUpperCase();
        const exchangeRate =
          reportCc === costCc
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

  function getCurrentRateForPair(from: string, to: string): number {
    const key = toRateKey(from, to);
    const fromNorm = String(from).toUpperCase();
    const fromLink = effectiveLinks.find(
      (l) => String(l.reportCurrency).toUpperCase() === fromNorm,
    );
    return fromLink?.exchangeRate ?? rateMap.get(key) ?? 1;
  }

  function applyGlobalRateToAllLinks(from: string, to: string, rate: number) {
    const exchangeRate = round2(rate);
    if (exchangeRate <= 0) return;
    const fromNorm = String(from).toUpperCase();
    const toNorm = String(to).toUpperCase();
    setLinks((current) =>
      current.map((link) => {
        if (
          String(link.reportCurrency).toUpperCase() !== fromNorm ||
          String(costCurrency).toUpperCase() !== toNorm
        ) {
          return link;
        }
        if (rateChangeUpdates === "costAmount") {
          return {
            ...link,
            exchangeRate,
            isManualRate: true,
            costAmount: round2(link.reportAmount * exchangeRate),
          };
        }
        const newReportAmount = Math.min(
          round2(link.costAmount / exchangeRate),
          link.maxReportAmount,
        );
        return {
          ...link,
          exchangeRate,
          isManualRate: true,
          reportAmount: newReportAmount,
          costAmount: round2(newReportAmount * exchangeRate),
        };
      }),
    );
  }
  const includedLinks = useMemo(
    () => effectiveLinks.filter((link) => link.isIncluded),
    [effectiveLinks],
  );

  const linksTotalCost = useMemo(
    () => money.sum(includedLinks.map((link) => link.costAmount)),
    [includedLinks],
  );
  const toPaySelectedTotal = useMemo(
    () =>
      money.sum(
        includedLinks.map((link) =>
          round2(link.maxReportAmount * link.exchangeRate),
        ),
      ),
    [includedLinks],
  );
  const invoicedSelectedTotal = linksTotalCost;
  const remainderSelectedTotal = useMemo(() => {
    const diff = money.subtract(toPaySelectedTotal, invoicedSelectedTotal);
    return money.compare(diff, 0) < 0 ? 0 : diff;
  }, [toPaySelectedTotal, invoicedSelectedTotal]);
  const hasZeroLink = useMemo(
    () =>
      includedLinks.some(
        (link) => link.reportAmount <= 0 || link.costAmount <= 0,
      ),
    [includedLinks],
  );

  const desiredCostAmount = costDraft.netValue ?? linksTotalCost;
  const totalDifference = money.subtract(desiredCostAmount, linksTotalCost);
  const isMismatched = money.compare(totalDifference, 0) !== 0;

  const deductionPercentClamped = Math.min(100, Math.max(0, deductionPercent));
  const paymentAmount =
    deductionPercentClamped > 0 && Number.isFinite(costDraft.netValue ?? NaN)
      ? round2((costDraft.netValue ?? 0) * (1 - deductionPercentClamped / 100))
      : null;

  const saveMutation = promiseState.useMutation(
    async (payload: CostPayload) => {
      const selectedLinks = includedLinks.filter(
        (link) => link.reportAmount > 0 && link.costAmount > 0,
      );

      if (selectedLinks.length === 0) {
        throw new Error("No report links selected.");
      }

      const createdCost = await services.mutationService.createCost(payload);

      for (const link of selectedLinks) {
        await services.mutationService.linkCostAndReport({
          costId: createdCost.id,
          reportId: link.reportId,
          costAmount: round2(link.costAmount),
          reportAmount: round2(link.reportAmount),
          description: `Bulk link for report #${link.reportId}`,
          breakdown: buildLinkBreakdownPayload(link, costCurrency),
        });
      }

      toast.success(
        `Created cost and linked ${selectedLinks.length} report${selectedLinks.length > 1 ? "s" : ""}.`,
      );
      onCompleted(createdCost.id);
    },
  );

  function updateLink(reportId: number, patch: Partial<LinkDraft>) {
    setLinks((current) =>
      current.map((link) =>
        link.reportId === reportId ? { ...link, ...patch } : link,
      ),
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
        const reportCc = String(link.reportCurrency).toUpperCase();
        const costCc = String(costCurrency).toUpperCase();
        const currentRate =
          reportCc === costCc
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

  function buildDryRunEntries(): DryRunEntry[] {
    const baseDescription = costDraft.description ?? "";
    const descriptionWithPayment =
      paymentAmount !== null && deductionPercentClamped > 0
        ? baseDescription +
          (baseDescription ? ". " : "") +
          `Payment amount (after ${deductionPercentClamped}% deduction): ${services.formatService.financial.amountText(paymentAmount, costDraft.currency ?? "EUR")}`
        : baseDescription;

    const costPayload: CostPayload = {
      workspaceId: costDraft.workspaceId!,
      contractorId: costDraft.contractorId ?? null,
      counterparty: costDraft.counterparty ?? "",
      currency: costDraft.currency!,
      netValue: costDraft.netValue ?? 0,
      grossValue: costDraft.grossValue ?? 0,
      invoiceNumber: costDraft.invoiceNumber!,
      invoiceDate: costDraft.invoiceDate!,
      description: descriptionWithPayment,
    };

    const selectedLinks = includedLinks.filter(
      (link) => link.reportAmount > 0 && link.costAmount > 0,
    );

    const entries: DryRunEntry[] = [
      {
        type: "create",
        entityType: "cost",
        description: `Create cost: ${costPayload.invoiceNumber} (${services.formatService.financial.amountText(costPayload.netValue, costPayload.currency)})`,
        payload: costPayload,
      },
      ...selectedLinks.map((link) => {
        const breakdown = buildLinkBreakdownPayload(link, costCurrency);
        return {
          type: "create" as const,
          entityType: "linkCostReport" as const,
          description: `Link report #${link.reportId} to cost: report ${services.formatService.financial.amountText(link.reportAmount, link.reportCurrency)} → cost ${services.formatService.financial.amountText(link.costAmount, costCurrency)}`,
          payload: {
            reportId: link.reportId,
            costAmount: round2(link.costAmount),
            reportAmount: round2(link.reportAmount),
            description: `Bulk link for report #${link.reportId}`,
            breakdown,
          },
        };
      }),
    ];
    return entries;
  }

  function openDryRunPreview() {
    if (hasZeroLink) {
      toast.error(
        "Zero-value mapping is not allowed. Set positive report and cost amounts for each row.",
      );
      return;
    }
    if (isMismatched) {
      toast.error(
        "Links total must match the final cost amount before saving.",
      );
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
    setDryRunEntries(buildDryRunEntries());
    setDryRunExpanded(new Set([0]));
    setDryRunPreviewOpen(true);
  }

  async function handleSave() {
    if (hasZeroLink) {
      toast.error(
        "Zero-value mapping is not allowed. Set positive report and cost amounts for each row.",
      );
      return;
    }
    if (isMismatched) {
      toast.error(
        "Links total must match the final cost amount before saving.",
      );
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

    const baseDescription = costDraft.description ?? "";
    const descriptionWithPayment =
      paymentAmount !== null && deductionPercentClamped > 0
        ? baseDescription +
          (baseDescription ? ". " : "") +
          `Payment amount (after ${deductionPercentClamped}% deduction): ${services.formatService.financial.amountText(paymentAmount, costDraft.currency ?? "EUR")}`
        : baseDescription;

    await saveMutation.track({
      workspaceId: costDraft.workspaceId,
      contractorId: costDraft.contractorId ?? null,
      counterparty: costDraft.counterparty ?? "",
      currency: costDraft.currency,
      netValue: costDraft.netValue ?? 0,
      grossValue: costDraft.grossValue ?? 0,
      invoiceNumber: costDraft.invoiceNumber,
      invoiceDate: costDraft.invoiceDate,
      description: descriptionWithPayment,
    });
  }

  async function handleConfirmSave() {
    try {
      await handleSave();
      setDryRunPreviewOpen(false);
    } catch {
      // Error already surfaced by mutation/toast
    }
  }

  function applyCurrencyChange(convertAmounts: boolean) {
    if (!pendingCurrencyChange) return;
    const { from, to } = pendingCurrencyChange;

    if (!convertAmounts) {
      setCostDraft((draft) => ({ ...draft, currency: to }));
      setPendingCurrencyChange(null);
      return;
    }

    setIsConvertingCurrency(true);
    services.exchangeService
      .ensureExchange(from, to, 1)
      .then((rate) => {
        const r = round2(rate);
        setCostDraft((draft) => {
          const newNet =
            draft.netValue != null ? round2(draft.netValue * r) : undefined;
          return {
            ...draft,
            currency: to,
            netValue: newNet,
            grossValue:
              newNet != null
                ? grossFromNet(newNet, vatPercentClamped)
                : draft.grossValue,
          };
        });
        setLinks((current) =>
          current.map((link) => ({
            ...link,
            costAmount: round2(link.costAmount * r),
          })),
        );
        setPendingCurrencyChange(null);
        toast.success(`Converted amounts using rate 1 ${from} = ${r} ${to}`);
      })
      .catch((err) => {
        console.error(err);
        toast.error(
          "Failed to fetch exchange rate. You can change currency without converting.",
        );
      })
      .finally(() => {
        setIsConvertingCurrency(false);
      });
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4 space-y-4">
          {resolvedRates === undefined && ratePairsFromMappings.length > 0 ? (
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
                          typeof workspaceId === "number"
                            ? workspaceId
                            : undefined,
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
                          typeof contractorId === "number"
                            ? contractorId
                            : null,
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
                  <Popover
                    open={pendingCurrencyChange != null}
                    onOpenChange={(open) => {
                      if (!open) setPendingCurrencyChange(null);
                    }}
                  >
                    <PopoverAnchor asChild>
                      <div className="inline-block">
                        <CurrencyPicker
                          value={costDraft.currency ?? null}
                          onSelect={(newCurrency) => {
                            const next = newCurrency ?? undefined;
                            const current = costDraft.currency;
                            if (next === current) return;
                            if (current != null && next != null) {
                              setPendingCurrencyChange({
                                from: current,
                                to: next,
                              });
                            } else {
                              setCostDraft((draft) => ({
                                ...draft,
                                currency: next,
                              }));
                            }
                          }}
                        />
                      </div>
                    </PopoverAnchor>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium text-sm">
                            Change cost currency
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            From <strong>{pendingCurrencyChange?.from}</strong>{" "}
                            to <strong>{pendingCurrencyChange?.to}</strong>. How
                            do you want to proceed?
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <strong>Just change</strong> — Keep the same numbers
                          (e.g. 1000 stays 1000).
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Convert amounts</strong> — Update net, gross
                          and link amounts using the exchange rate so the
                          invoice covers the same value.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingCurrencyChange(null)}
                            disabled={isConvertingCurrency}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyCurrencyChange(false)}
                            disabled={isConvertingCurrency}
                          >
                            Just change
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyCurrencyChange(true)}
                            disabled={isConvertingCurrency}
                          >
                            {isConvertingCurrency
                              ? "Converting…"
                              : "Convert amounts"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Net Value</div>
                  <NumberInputAsString
                    aria-label="Net value"
                    value={
                      Number.isFinite(costDraft.netValue ?? NaN)
                        ? String(costDraft.netValue)
                        : ""
                    }
                    onChange={onNetValueChange}
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
                  <div className="text-sm font-medium mb-1">VAT %</div>
                  <NumberInput
                    aria-label="VAT percentage"
                    value={vatPercentClamped}
                    minValue={0}
                    maxValue={100}
                    step={0.5}
                    onChange={(value) => {
                      onVatPercentInputChange(value);
                    }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Default from preferences; gross = net × (1 + VAT%).
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Gross Value</div>
                  <NumberInputAsString
                    aria-label="Gross value"
                    value={
                      Number.isFinite(costDraft.grossValue ?? NaN)
                        ? String(costDraft.grossValue)
                        : ""
                    }
                    onChange={(value) => onGrossValueChange(value)}
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

              <div
                className="rounded-xl border-2 border-amber-200 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/30 p-4 space-y-4"
                role="region"
                aria-label="Payment and exchange"
              >
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Payment & exchange — check before saving
                </div>
                <div className="flex flex-wrap items-center gap-2 text-amber-800 dark:text-amber-200">
                  <span className="text-sm">When rate changes, update:</span>
                  <ToggleGroup
                    type="single"
                    value={rateChangeUpdates}
                    onValueChange={(v) =>
                      (v === "costAmount" || v === "reportAmount") &&
                      setRateChangeUpdates(v)
                    }
                    className="inline-flex"
                    variant="outline"
                    size="sm"
                  >
                    <ToggleGroupItem
                      value="costAmount"
                      aria-label="Update cost amount (report fixed)"
                    >
                      Cost amount
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="reportAmount"
                      aria-label="Update report amount (cost fixed)"
                    >
                      Report amount
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <span className="text-xs text-amber-700/90 dark:text-amber-300/90">
                    (report × rate = cost)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-200">
                      Payment deduction %
                    </div>
                    <NumberInput
                      aria-label="Payment deduction percentage"
                      value={deductionPercentClamped}
                      minValue={0}
                      maxValue={100}
                      step={0.5}
                      onChange={(value) =>
                        setDeductionPercent(value !== undefined ? value : 0)
                      }
                    />
                    <div className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-1">
                      e.g. 12 for Umowa o dzieło. Net stays; we pay net minus
                      this %.
                    </div>
                  </div>
                  {paymentAmount !== null && (
                    <div>
                      <div className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-200">
                        Payment amount
                      </div>
                      <div className="text-base font-semibold text-amber-900 dark:text-amber-100">
                        {services.formatService.financial.amount(
                          paymentAmount,
                          costDraft.currency ?? "EUR",
                        )}
                      </div>
                      <div className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-1">
                        Amount paid to contractor (after deduction).
                      </div>
                    </div>
                  )}
                  {ratePairsFromMappings.map(({ from, to }) => (
                    <div key={toRateKey(from, to)}>
                      <div className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-200">
                        Rate {from}→{to}
                      </div>
                      <div className="flex items-center gap-2">
                        <NumberInput
                          aria-label={`Exchange rate ${from} to ${to}`}
                          value={getCurrentRateForPair(from, to)}
                          minValue={0}
                          step={0.0001}
                          onChange={(value) => {
                            const v = value ?? 0;
                            applyGlobalRateToAllLinks(from, to, v);
                          }}
                        />
                        <span className="text-muted-foreground text-sm shrink-0">
                          {to}
                        </span>
                      </div>
                      {rateMap.has(toRateKey(from, to)) && (
                        <div className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-1">
                          Market:{" "}
                          {Number(rateMap.get(toRateKey(from, to))).toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Report to cost mapping
                </div>
                <div className="text-xs text-muted-foreground">
                  Defaults use each report&apos;s <code>to pay</code> amount.
                  Cost currency amount is editable per row; one global rate
                  above applies to all rows for that currency pair.
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
                        updateLink(link.reportId, {
                          isIncluded: checked === true,
                        })
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
                      #{link.reportId}{" "}
                      {link.reportDescription || "No description"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      To pay:{" "}
                      {services.formatService.financial.amount(
                        link.maxReportAmount,
                        link.reportCurrency,
                      )}{" "}
                      | Remaining:{" "}
                      {services.formatService.financial.amount(
                        round2(
                          Math.max(link.maxReportAmount - link.reportAmount, 0),
                        ),
                        link.reportCurrency,
                      )}
                    </div>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <div className="text-xs text-muted-foreground">
                      Report amount
                    </div>
                    <NumberInput
                      aria-label={`Report amount for report ${link.reportId}`}
                      value={link.reportAmount}
                      minValue={0}
                      maxValue={link.maxReportAmount}
                      isDisabled={!link.isIncluded}
                      formatOptions={{
                        style: "currency",
                        currency: link.reportCurrency,
                      }}
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
                      Cost amount
                    </div>
                    <NumberInput
                      aria-label={`Cost amount for report ${link.reportId}`}
                      value={link.costAmount}
                      minValue={0}
                      isDisabled={!link.isIncluded}
                      formatOptions={{
                        style: "currency",
                        currency: costCurrency,
                      }}
                      onChange={(value) => {
                        const costAmount = round2(value ?? 0);
                        updateLink(link.reportId, {
                          costAmount,
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
                    {services.formatService.financial.amount(
                      linksTotalCost,
                      costCurrency,
                    )}{" "}
                    while cost net amount is{" "}
                    {services.formatService.financial.amount(
                      desiredCostAmount,
                      costCurrency,
                    )}
                    . Difference:{" "}
                    {services.formatService.financial.amount(
                      totalDifference,
                      costCurrency,
                    )}
                    .
                  </AlertDescription>
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setNetValue(linksTotalCost)}
                    >
                      Set net value to links total
                    </Button>
                  </div>
                </Alert>
              )}
            </>
          )}
      </div>

      <DrawerFooter className="border-t border-border shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 text-sm">
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                To pay
              </div>
              <div className="font-semibold">
                {services.formatService.financial.amount(
                  toPaySelectedTotal,
                  costCurrency,
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                selected reports
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Invoiced
              </div>
              <div className="font-semibold">
                {services.formatService.financial.amount(
                  invoicedSelectedTotal,
                  costCurrency,
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                covered by new cost
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Remainder
              </div>
              <div className="font-semibold">
                {services.formatService.financial.amount(
                  remainderSelectedTotal,
                  costCurrency,
                )}
              </div>
              <div className="text-xs text-muted-foreground">still to pay</div>
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={openDryRunPreview}
                disabled={
                  mt.isInProgress(saveMutation.state) ||
                  hasZeroLink ||
                  isMismatched
                }
              >
                Next
              </Button>
            </div>
          </div>
      </DrawerFooter>

      <Dialog open={dryRunPreviewOpen} onOpenChange={setDryRunPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: what will be saved</DialogTitle>
            <DialogDescription>
              Review the cost and links that will be created in the database.
              Expand each row to see the exact payload. Click Confirm to
              execute.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {dryRunEntries.map((entry, index) => {
              const isOpen = dryRunExpanded.has(index);
              const label =
                entry.entityType === "cost" ? "Cost" : "Cost–Report link";
              return (
                <Collapsible
                  key={index}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setDryRunExpanded((prev) => {
                      const next = new Set(prev);
                      if (open) next.add(index);
                      else next.delete(index);
                      return next;
                    });
                  }}
                >
                  <div className="border rounded-lg border-border bg-card">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                          Create
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {entry.description}
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-border space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground pt-2">
                          Payload (DB)
                        </div>
                        <pre className="text-xs bg-muted p-3 rounded-md border border-border overflow-x-auto">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDryRunPreviewOpen(false)}
              disabled={mt.isInProgress(saveMutation.state)}
            >
              Back
            </Button>
            <Button
              onClick={() => void handleConfirmSave()}
              disabled={
                mt.isInProgress(saveMutation.state) ||
                dryRunEntries.length === 0
              }
            >
              {mt.isInProgress(saveMutation.state)
                ? "Saving..."
                : "Confirm & save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
