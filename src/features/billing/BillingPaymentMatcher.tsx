import { Button } from "@/components/ui/button.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  clearBillingPaymentMatcherDraft,
  saveBillingPaymentMatcherDraft,
  type BillingMatcherRestorePayload,
} from "@/features/billing/billingPaymentMatcherPersistence.ts";
import { MatcherDateField } from "@/features/billing/BillingMatcherRowEditPopover.tsx";
import type { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import type { BillingMatcherDraftMatch } from "@/features/billing/billingMatcher.types.ts";
import {
  billingsToMatchInput,
  guessMimeType,
  readFileAsBase64,
} from "@/features/billing/billingMatcherUtils.ts";
import type { BillingMatcherListQuery } from "@/features/billing/BillingMatcherMatchesTable.tsx";
import { BillingMatcherMatchesTable } from "@/features/billing/BillingMatcherMatchesTable.tsx";
import { useBillingPaymentMatcherColumns } from "@/features/billing/useBillingPaymentMatcherColumns.tsx";
import { AiLoadingOverlay } from "@/features/_common/patterns/AiLoadingOverlay.tsx";
import { FileDropEmptyState } from "@/features/_common/patterns/FileDropEmptyState.tsx";
import { IconTile } from "@/features/_common/patterns/IconTile.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SelectedUploadCard } from "@/features/_common/patterns/SelectedUploadCard.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { UploadDropCard } from "@/features/_common/patterns/UploadDropCard.tsx";
import { formatBytes } from "@/platform/lang/formatBytes.ts";
import { cn } from "@/lib/utils.ts";
import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import { GEMINI_API_KEY_VARIABLE_NAME } from "@/services/front/AiMatchingService/geminiVariables.ts";
import type { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { CalendarDate, parseDate } from "@internationalized/date";
import { mt } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import {
  FileQuestion,
  FileText,
  ListChecks,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export function BillingPaymentMatcherDialog({
  open,
  onOpenChange,
  services,
  unpaidBillings,
  billingLookupEntries,
  variableContext,
  workspaceId,
  clientId,
  restorePayload,
  onRestoreConsumed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: BillingWidgetProps["services"];
  unpaidBillings: BillingViewEntry[];
  /** All billings in the current view (for paid-date lookup / warnings). */
  billingLookupEntries: BillingViewEntry[];
  variableContext: ExpressionContext;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  /** When set (e.g. after reload), hydrates review step from persisted AI result. */
  restorePayload: BillingMatcherRestorePayload | null;
  onRestoreConsumed?: () => void;
}) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [filePayload, setFilePayload] = useState<{
    dataBase64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [defaultCurrency, setDefaultCurrency] = useState("PLN");
  const [matches, setMatches] = useState<BillingMatcherDraftMatch[]>([]);
  const [unmatchedPaymentHints, setUnmatchedPaymentHints] = useState<string[]>(
    [],
  );

  const restoreHandledRef = useRef(false);
  const onRestoreConsumedRef = useRef(onRestoreConsumed);
  onRestoreConsumedRef.current = onRestoreConsumed;

  useLayoutEffect(() => {
    if (!open) {
      restoreHandledRef.current = false;
      return;
    }
    if (!restorePayload || restoreHandledRef.current) {
      return;
    }
    restoreHandledRef.current = true;
    setDefaultCurrency(restorePayload.defaultCurrency);
    setFileLabel(restorePayload.fileName ?? null);
    setUnmatchedPaymentHints(
      restorePayload.aiResponse.unmatchedPaymentHints ?? [],
    );
    setMatches(
      restorePayload.aiResponse.matches.map((m) => ({
        key: uuidv4(),
        billingId: m.billingId,
        paidAt: parseDate(m.paidAt),
        justification: m.justification,
        paymentTitle: m.paymentTitle ?? "",
        paymentAmount: m.paymentAmount ?? null,
        paymentSummary: m.paymentSummary,
        confidence: m.confidence,
      })),
    );
    setStep("review");
    onRestoreConsumedRef.current?.();
  }, [open, restorePayload]);

  const aiMutation = promiseState.useMutation(async () => {
    if (!filePayload) {
      toast.error("Choose a bank file first.");
      return;
    }
    const billings = billingsToMatchInput(unpaidBillings);
    if (billings.length === 0) {
      toast.error("No unpaid invoices in the selection.");
      return;
    }
    let result;
    try {
      result = await services.aiMatchingService.matchBankDocumentToBillings(
        {
          dataBase64: filePayload.dataBase64,
          mimeType: filePayload.mimeType,
          fileName: filePayload.fileName,
        },
        billings,
        { defaultCurrency, variableContext },
      );
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : `Add a const variable "${GEMINI_API_KEY_VARIABLE_NAME}" in Variables for this workspace/client.`,
      );
      return;
    }
    setUnmatchedPaymentHints(result.unmatchedPaymentHints ?? []);
    setMatches(
      result.matches.map((m) => ({
        key: uuidv4(),
        billingId: m.billingId,
        paidAt: parseDate(m.paidAt),
        justification: m.justification,
        paymentTitle: m.paymentTitle,
        paymentAmount: m.paymentAmount,
        paymentSummary: m.paymentSummary,
        confidence: m.confidence,
      })),
    );
    setStep("review");
    saveBillingPaymentMatcherDraft({
      workspaceId,
      clientId,
      selectedBillingIds: unpaidBillings.map((b) => b.id),
      aiResponse: result,
      defaultCurrency,
      fileName: filePayload.fileName,
    });
    toast.success("AI suggested matches — review before applying.");
  });

  const applyMutation = promiseState.useMutation(
    async (mode: "all" | "high") => {
      const toApply =
        mode === "high"
          ? matches.filter((m) => m.confidence === "high")
          : matches;
      if (toApply.length === 0) {
        toast.error(
          mode === "high"
            ? "No high-confidence matches to apply."
            : "No matches to apply.",
        );
        return;
      }
      await services.mutationService.bulkMarkBillingPaid(
        toApply.map((m) => ({
          billingId: m.billingId,
          paidAt: m.paidAt,
          paidAtJustification: m.justification.trim() || null,
        })),
      );
      toast.success(`Marked ${toApply.length} invoice(s) as paid.`);
      clearBillingPaymentMatcherDraft();
      const appliedKeys = new Set(toApply.map((m) => m.key));
      const next = matches.filter((m) => !appliedKeys.has(m.key));
      setMatches(next);
      if (next.length === 0) {
        onOpenChange(false);
        resetState();
      }
    },
  );

  function resetState() {
    setStep("upload");
    setFileLabel(null);
    setFileMeta(null);
    setFilePayload(null);
    setMatches([]);
    setUnmatchedPaymentHints([]);
  }

  const billingById = useMemo(() => {
    const m = new Map<number, BillingViewEntry>();
    billingLookupEntries.forEach((b) => m.set(b.id, b));
    return m;
  }, [billingLookupEntries]);

  const unmatchedBillings = useMemo(
    () =>
      unpaidBillings.filter((b) => !matches.some((m) => m.billingId === b.id)),
    [unpaidBillings, matches],
  );

  const selectionTotalsByCurrency = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of unpaidBillings) {
      const c = b.grossAmount.currency;
      m.set(c, (m.get(c) ?? 0) + b.grossAmount.amount);
    }
    return m;
  }, [unpaidBillings]);

  const aiRunning = step === "upload" && mt.isInProgress(aiMutation.state);

  const matchHigh = useMemo(
    () => matches.filter((m) => m.confidence === "high"),
    [matches],
  );
  const matchMedium = useMemo(
    () => matches.filter((m) => m.confidence === "medium"),
    [matches],
  );
  const matchLow = useMemo(
    () => matches.filter((m) => m.confidence === "low"),
    [matches],
  );

  const [manualBillingId, setManualBillingId] = useState<string>("");

  const formatDate = useCallback(
    (d: CalendarDate) => services.formatService.temporal.date(d),
    [services.formatService],
  );

  const paymentMatcherListQuery = useMemo<BillingMatcherListQuery>(
    () => ({
      sort: null,
      page: paginationUtils.ofDefault(),
    }),
    [],
  );

  const paymentMatcherColumns = useBillingPaymentMatcherColumns({
    billingById,
    defaultCurrency,
    formatDate,
    services,
    unmatchedPaymentHints,
    setMatches,
  });

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
      direction="right"
    >
      <DrawerContent
        data-vaul-no-drag
        className={cn(
          "inset-y-0 right-0 left-auto mt-0 flex h-full max-h-screen max-w-[calc(100vw-20rem)] flex-col rounded-l-2xl border-l border-border p-0",
          "[&>div:first-child]:hidden",
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-l-2xl">
          <DrawerHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
            <DrawerTitle className="text-lg">
              Match bank file to selected invoices
            </DrawerTitle>
            <DrawerDescription className="text-sm leading-relaxed">
              {step === "upload" ? (
                <>
                  Upload a bank export (CSV, PDF, plain text) as exported from
                  your bank. Only unpaid rows from your current table selection
                  are sent to the model. The API key is read from Variables (
                  <span className="font-mono text-foreground">
                    {GEMINI_API_KEY_VARIABLE_NAME}
                  </span>
                  ).
                </>
              ) : (
                <>
                  Review matches in the table — dates and notes are read-only
                  here; use{" "}
                  <span className="font-medium text-foreground">Edit</span> on a
                  row to change payment date or note. If an invoice already has
                  a paid date in the app, compare it to the suggestion.
                </>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <div
            className={cn(
              "min-h-0 flex-1 px-6 py-6",
              step === "upload"
                ? "overflow-y-auto"
                : "flex flex-col overflow-hidden",
            )}
          >
            {step === "upload" ? (
              <div className="mx-auto grid min-h-0 w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-stretch lg:gap-x-8 lg:gap-y-4">
                <UploadDropCard
                  className="lg:row-span-2 lg:h-full lg:min-h-0"
                  icon={<Upload aria-hidden />}
                  title="Bank export"
                  description="Drop your file or browse — no need to clean or edit the file first."
                >
                  <input
                    ref={fileInputRef}
                    id="bank-file-input"
                    type="file"
                    accept=".csv,.pdf,.txt,text/csv,application/pdf,text/plain"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFileMeta({ name: file.name, size: file.size });
                      void (async () => {
                        try {
                          const dataBase64 = await readFileAsBase64(file);
                          setFilePayload({
                            dataBase64,
                            mimeType: guessMimeType(file),
                            fileName: file.name,
                          });
                          setFileLabel(file.name);
                        } catch {
                          toast.error("Could not read file.");
                        }
                      })();
                    }}
                  />

                  {filePayload ? (
                    <SelectedUploadCard
                      leading={
                        <IconTile variant="muted">
                          <FileText aria-hidden />
                        </IconTile>
                      }
                      title={fileMeta?.name ?? filePayload.fileName}
                      subtitle={
                        fileMeta ? formatBytes(fileMeta.size) : undefined
                      }
                      actions={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full shrink-0 sm:w-auto"
                          onClick={() => {
                            const el = fileInputRef.current;
                            if (el) el.value = "";
                            el?.click();
                          }}
                        >
                          Replace file
                        </Button>
                      }
                    />
                  ) : (
                    <FileDropEmptyState
                      inputId="bank-file-input"
                      title="Choose a bank file"
                      description="CSV, PDF, or TXT — same as from your bank"
                    />
                  )}
                </UploadDropCard>

                <SurfaceCard className="flex h-full min-h-0 flex-col">
                  <PanelSectionLabel icon={ListChecks}>
                    Selection
                  </PanelSectionLabel>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                    {unpaidBillings.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    unpaid invoice
                    {unpaidBillings.length === 1 ? "" : "s"} in scope
                  </p>
                  {selectionTotalsByCurrency.size > 0 ? (
                    <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-4 text-sm">
                      {[...selectionTotalsByCurrency.entries()].map(
                        ([currency, amount]) => (
                          <li
                            key={currency}
                            className="flex justify-between gap-3"
                          >
                            <span className="text-muted-foreground">
                              Gross ({currency})
                            </span>
                            <span className="font-medium tabular-nums text-foreground">
                              {services.formatService.financial.amountText(
                                amount,
                                currency,
                              )}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200/90">
                      Select unpaid rows in the billing table, then open this
                      tool from the bulk bar.
                    </p>
                  )}
                </SurfaceCard>

                <SurfaceCard className="flex h-full min-h-0 flex-col">
                  <Label
                    htmlFor="default-currency"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Default currency hint
                  </Label>
                  <p className="mb-3 mt-1 text-sm leading-relaxed text-muted-foreground">
                    Used when the bank file doesn’t state a currency for a line.
                  </p>
                  <Input
                    id="default-currency"
                    value={defaultCurrency}
                    onChange={(e) =>
                      setDefaultCurrency(e.target.value.toUpperCase() || "PLN")
                    }
                    className="font-mono text-base tracking-wide"
                    maxLength={8}
                  />
                </SurfaceCard>
              </div>
            ) : (
              <Tabs
                defaultValue="matches"
                className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden"
              >
                <TabsList
                  size="sm"
                  className="h-auto w-full shrink-0 flex-wrap justify-start gap-1 rounded-lg border-0 bg-muted/50 p-1"
                >
                  <TabsTrigger value="matches" size="sm">
                    <span className="inline-flex flex-wrap items-center gap-x-1">
                      Matches ({matches.length})
                      {matches.length > 0 ? (
                        <span className="font-normal text-muted-foreground">
                          · {matchHigh.length}H {matchMedium.length}M{" "}
                          {matchLow.length}L
                        </span>
                      ) : null}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="unbilled" size="sm">
                    Unmatched invoices ({unmatchedBillings.length})
                  </TabsTrigger>
                  <TabsTrigger value="unpay" size="sm">
                    Unmatched payments ({unmatchedPaymentHints.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="matches"
                  className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden outline-none"
                >
                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                      <div className="space-y-8">
                        {matchHigh.length > 0 &&
                        matchHigh.length < matches.length ? (
                          <div className="-mx-1 mb-2 flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 text-sm">
                              <ShieldCheck
                                className="mt-0.5 size-4 shrink-0 text-primary"
                                aria-hidden
                              />
                              <p className="leading-snug text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {matchHigh.length}
                                </span>{" "}
                                high-confidence match
                                {matchHigh.length === 1 ? "" : "es"} — apply
                                without medium or low rows.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="shrink-0"
                              disabled={mt.isInProgress(applyMutation.state)}
                              onClick={() => void applyMutation.track("high")}
                            >
                              Apply high only
                            </Button>
                          </div>
                        ) : null}

                        <BillingMatcherMatchesTable
                          title="High confidence"
                          subtitle="Strong match between bank line and invoice — usually safe to apply."
                          rows={matchHigh}
                          tone="high"
                          columns={paymentMatcherColumns}
                          query={paymentMatcherListQuery}
                        />

                        <BillingMatcherMatchesTable
                          title="Medium confidence"
                          subtitle="Reasonable match — review dates and amounts before applying."
                          rows={matchMedium}
                          tone="medium"
                          columns={paymentMatcherColumns}
                          query={paymentMatcherListQuery}
                        />

                        <BillingMatcherMatchesTable
                          title="Low confidence"
                          subtitle="Uncertain — verify each row against the bank file before marking paid."
                          rows={matchLow}
                          tone="low"
                          columns={paymentMatcherColumns}
                          query={paymentMatcherListQuery}
                        />

                        {matches.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No matches from the model.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="grid min-w-[220px] flex-1 gap-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Add match — invoice
                        </Label>
                        <Select
                          value={manualBillingId}
                          onValueChange={setManualBillingId}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Choose billing" />
                          </SelectTrigger>
                          <SelectContent>
                            {unmatchedBillings.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.invoiceNumber} (#{b.id}) ·{" "}
                                {services.formatService.financial.amountText(
                                  b.grossAmount.amount,
                                  b.grossAmount.currency,
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        disabled={!manualBillingId}
                        onClick={() => {
                          const bid = Number(manualBillingId);
                          if (!Number.isFinite(bid)) return;
                          setMatches((prev) => [
                            ...prev,
                            {
                              key: uuidv4(),
                              billingId: bid,
                              paidAt: dateToCalendarDate(new Date()),
                              justification: "",
                              paymentTitle: "",
                              paymentAmount: null,
                              paymentSummary: "",
                              confidence: "medium",
                            },
                          ]);
                          setManualBillingId("");
                        }}
                      >
                        Add row
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="unbilled"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                    {unmatchedBillings.length === 0 ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        No unmatched invoices — every selected unpaid row
                        appears in Matches, or will show here if the model did
                        not suggest a bank line for it.
                      </p>
                    ) : (
                      <SurfaceCard className="overflow-hidden p-0">
                        <div className="border-b border-border bg-muted/25 px-5 py-4">
                          <PanelSectionLabel icon={FileQuestion}>
                            Not matched to a bank line
                          </PanelSectionLabel>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Still unpaid and without a row in the Matches tab.
                            Add them manually from Matches, or try another
                            export.
                          </p>
                        </div>
                        <ul className="divide-y divide-border/80">
                          {unmatchedBillings.map((b) => (
                            <li key={b.id} className="px-5 py-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium leading-snug text-foreground">
                                    {b.invoiceNumber}{" "}
                                    <span className="font-normal text-muted-foreground">
                                      (#{b.id})
                                    </span>
                                  </p>
                                  <p className="text-sm tabular-nums text-muted-foreground">
                                    {services.formatService.financial.amountText(
                                      b.grossAmount.amount,
                                      b.grossAmount.currency,
                                    )}
                                    {b.client.name?.trim() ? (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        · {b.client.name.trim()}
                                      </span>
                                    ) : null}
                                  </p>
                                </div>
                                <MatcherDateField label="Invoice date">
                                  <span className="tabular-nums text-sm leading-none text-foreground">
                                    {formatDate(b.invoiceDate)}
                                  </span>
                                </MatcherDateField>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </SurfaceCard>
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="unpay"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                    {unmatchedPaymentHints.length === 0 ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        No unmatched payment hints — the model linked every bank
                        line it could to an invoice.
                      </p>
                    ) : (
                      <SurfaceCard className="overflow-hidden p-0">
                        <div className="border-b border-border bg-muted/25 px-5 py-4">
                          <PanelSectionLabel icon={Receipt}>
                            Bank lines without an invoice
                          </PanelSectionLabel>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Text from your file the model could not tie to a
                            selected invoice. Use this to find transfers in the
                            export or to create manual matches.
                          </p>
                        </div>
                        <ul className="divide-y divide-border/80">
                          {unmatchedPaymentHints.map((h, i) => (
                            <li
                              key={`${i}-${h.slice(0, 24)}`}
                              className="px-5 py-4 text-sm leading-relaxed break-words text-foreground"
                            >
                              {h}
                            </li>
                          ))}
                        </ul>
                      </SurfaceCard>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DrawerFooter className="shrink-0 gap-2 sm:flex-row sm:justify-end">
            {step === "upload" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={
                    filePayload == null ||
                    unpaidBillings.length === 0 ||
                    mt.isInProgress(aiMutation.state)
                  }
                  onClick={() => void aiMutation.track(void 0)}
                >
                  <span className="inline-flex items-center gap-2">
                    {mt.isInProgress(aiMutation.state) ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="size-4" aria-hidden />
                    )}
                    Run AI match
                  </span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("upload")}
                >
                  Back
                </Button>
                {matchHigh.length > 0 && matchHigh.length < matches.length ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      matchHigh.length === 0 ||
                      mt.isInProgress(applyMutation.state)
                    }
                    onClick={() => void applyMutation.track("high")}
                  >
                    {mt.isInProgress(applyMutation.state)
                      ? "Applying…"
                      : `Apply high only (${matchHigh.length})`}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={
                    matches.length === 0 || mt.isInProgress(applyMutation.state)
                  }
                  onClick={() => void applyMutation.track("all")}
                >
                  {mt.isInProgress(applyMutation.state)
                    ? "Applying…"
                    : matchHigh.length === matches.length && matches.length > 0
                      ? `Apply ${matches.length} mark(s) as paid`
                      : `Apply all (${matches.length})`}
                </Button>
              </>
            )}
          </DrawerFooter>

          {aiRunning ? (
            <AiLoadingOverlay
              title="Analyzing your bank file"
              description={
                <>
                  Cross-checking bank lines with{" "}
                  <span className="font-medium text-foreground">
                    {unpaidBillings.length}
                  </span>{" "}
                  selected invoice
                  {unpaidBillings.length === 1 ? "" : "s"}
                </>
              }
              fileName={filePayload?.fileName ?? fileLabel}
              footerHint="Gemini is reading amounts, dates, and references…"
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
