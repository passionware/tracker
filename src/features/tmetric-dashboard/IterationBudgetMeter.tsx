import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { BudgetTargetHistoryChart } from "@/features/_common/budget-target/BudgetTargetHistoryChart";
import { BudgetTargetLogEditDialog } from "@/features/_common/budget-target/BudgetTargetLogEditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WithFrontServices } from "@/core/frontServices";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { computePeriodProgress } from "@/platform/lang/datetime-utils";
import {
  getBillingByIteration,
  sumCurrencyValuesInTarget,
} from "./tmetric-dashboard.utils";
import { useFetchReportForIterationPeriod } from "./useFetchReportForIterationPeriod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { rd } from "@passionware/monads";

function getBudgetInTarget(
  currentTrigger: number | null,
  iterationCurrency: string,
  rateMap: Map<string, number>,
  targetCurrency: string,
): number {
  const budget = currentTrigger ?? 0;
  if (budget === 0) return 0;
  const from = iterationCurrency.toUpperCase();
  const to = targetCurrency.toUpperCase();
  const rate = from === to ? 1 : (rateMap.get(`${from}->${to}`) ?? 0);
  return budget * rate;
}

/** Progress pipe: 5-column grid — labels | bars | value | "of" | total (so "of" aligns). */
function BudgetUsedVsElapsedBar({
  elapsedPercent,
  elapsedValue,
  elapsedTotal,
  budgetUsedPercent,
  budgetUsedValue,
  budgetUsedTotal,
}: {
  elapsedPercent: number;
  elapsedValue: React.ReactNode;
  elapsedTotal: React.ReactNode;
  budgetUsedPercent: number;
  budgetUsedValue: React.ReactNode;
  budgetUsedTotal: React.ReactNode | null;
}) {
  const maxPct = Math.max(100, budgetUsedPercent, elapsedPercent, 10);
  const pctToWidth = (pct: number) => Math.min(100, (pct / maxPct) * 100);
  const hundredLeft = pctToWidth(100);
  const isOver = budgetUsedPercent > 100;
  return (
    <div
      className="grid gap-x-2 gap-y-1.5 items-center text-xs"
      style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}
    >
      <span className="text-muted-foreground">Elapsed</span>
      <div className="relative h-2 rounded-full bg-muted overflow-visible min-w-0">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/30"
          style={{ width: `${pctToWidth(elapsedPercent)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 -translate-x-px"
          style={{ left: `${hundredLeft}%` }}
          title="100%"
        />
      </div>
      <span className="tabular-nums text-muted-foreground text-right -mr-2.5">
        {elapsedValue}
      </span>
      <span className="text-muted-foreground text-center min-w-[1.5rem]">
        of
      </span>
      <span className="tabular-nums text-muted-foreground -ml-2.5">
        {elapsedTotal}
      </span>

      <span className="text-muted-foreground">Budget used</span>
      <div className="relative h-2 rounded-full bg-muted overflow-visible min-w-0">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isOver ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${pctToWidth(budgetUsedPercent)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 -translate-x-px"
          style={{ left: `${hundredLeft}%` }}
          title="100%"
        />
      </div>
      <span className="tabular-nums text-[color-mix(in_oklch,_var(--color-primary)_70%,_var(--color-foreground))] text-right -mr-2.5">
        {budgetUsedValue}
      </span>
      <span className="text-muted-foreground text-center min-w-[1.5rem]">
        {budgetUsedTotal != null ? "of" : ""}
      </span>
      <span className="tabular-nums text-[color-mix(in_oklch,_var(--color-destructive)_70%,_var(--color-foreground))] -ml-2.5">
        {budgetUsedTotal ?? ""}
      </span>
    </div>
  );
}

export interface IterationBudgetDetailProps extends WithFrontServices {
  iteration: ProjectIteration;
  billingValues: { amount: number; currency: string }[];
  rateMap: Map<string, number>;
  targetCurrency: string;
  iterationLabel: string;
  projectName: string;
  /** When true, show the "set new target" form; when false, hide it. */
  editMode?: boolean;
}

/** Inline detail content: bars, chart, and (when editMode) budget target form. */
export function IterationBudgetDetail({
  iteration,
  billingValues,
  rateMap,
  targetCurrency,
  services,
  editMode = false,
}: IterationBudgetDetailProps) {
  const currentTargetRd =
    services.iterationTriggerService.useCurrentBudgetTarget(iteration.id);
  const currentTarget = rd.getOrElse(currentTargetRd, () => null);
  const budgetInTarget = getBudgetInTarget(
    currentTarget,
    iteration.currency,
    rateMap,
    targetCurrency,
  );
  const billingInTarget = sumCurrencyValuesInTarget(
    billingValues,
    rateMap,
    targetCurrency,
  );
  const billingInIterationCurrency = sumCurrencyValuesInTarget(
    billingValues,
    rateMap,
    iteration.currency,
  );
  const startDate = calendarDateToJSDate(iteration.periodStart);
  const endDate = calendarDateToJSDate(iteration.periodEnd);
  const { elapsedPercent, elapsedDays, totalDays } = computePeriodProgress(
    startDate,
    endDate,
  );
  const budgetUsedPercent =
    budgetInTarget > 0 ? (billingInTarget / budgetInTarget) * 100 : 0;
  return (
    <IterationBudgetDetailContent
      iteration={iteration}
      currentTarget={currentTarget}
      targetCurrency={targetCurrency}
      billingInIterationCurrency={billingInIterationCurrency}
      budgetInTarget={budgetInTarget}
      elapsedPercent={elapsedPercent}
      elapsedDays={elapsedDays}
      totalDays={totalDays}
      budgetUsedPercent={budgetUsedPercent}
      services={services}
      editMode={editMode}
    />
  );
}

/** Update budget target form: input + Update button. Used in popover and inline detail. */
function UpdateBudgetTargetForm({
  iteration,
  currentTarget,
  targetCurrency,
  services,
  variant = "default",
}: {
  iteration: ProjectIteration;
  currentTarget: number | null;
  targetCurrency: string;
  services: WithFrontServices["services"];
  /** "toolbar" = single compact row (label + input + button), no vertical stack */
  variant?: "default" | "toolbar";
}) {
  const fetchReportForIterationPeriod = useFetchReportForIterationPeriod(services);
  const [targetInput, setTargetInput] = useState(
    currentTarget != null ? String(currentTarget) : "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const value: number | null =
      targetInput.trim() === "" ? null : Number(targetInput);
    if (value !== null && (Number.isNaN(value) || value < 0)) return;
    setIsSaving(true);
    let billingSnapshot: { amount: number; currency: string } | undefined;
    if (targetCurrency) {
      const result = await fetchReportForIterationPeriod(iteration);
      if (result) {
        const billingValues = getBillingByIteration(
          result.reportData,
          new Set([iteration.id]),
        ).get(iteration.id);
        const amount =
          billingValues != null
            ? sumCurrencyValuesInTarget(
                billingValues,
                result.rateMap,
                targetCurrency,
              )
            : 0;
        if (amount > 0) {
          billingSnapshot = { amount, currency: targetCurrency };
        }
      }
    }
    try {
      await services.mutationService.logBudgetTargetChange(
        iteration.id,
        value,
        billingSnapshot,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inputAndButton = (
    <>
      <Input
        type="number"
        min={0}
        step={0.01}
        placeholder="Optional"
        value={targetInput}
        onChange={(e) => setTargetInput(e.target.value)}
        className="h-8 text-sm w-24"
      />
      <Button
        size="sm"
        className="h-8"
        onClick={() => void handleSave()}
        disabled={
          targetInput ===
            (currentTarget != null ? String(currentTarget) : "") ||
          (targetInput.trim() !== "" &&
            (Number.isNaN(Number(targetInput)) || Number(targetInput) < 0))
        }
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
      </Button>
    </>
  );

  if (variant === "toolbar") {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Target ({iteration.currency})
        </span>
        {inputAndButton}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">
        Budget target ({iteration.currency})
      </label>
      <div className="flex gap-2">{inputAndButton}</div>
    </div>
  );
}

function IterationBudgetDetailContent({
  iteration,
  currentTarget,
  targetCurrency,
  billingInIterationCurrency,
  budgetInTarget,
  elapsedPercent,
  elapsedDays,
  totalDays,
  budgetUsedPercent,
  services,
  editMode = false,
}: {
  iteration: ProjectIteration;
  currentTarget: number | null;
  targetCurrency: string;
  billingInIterationCurrency: number;
  budgetInTarget: number;
  elapsedPercent: number;
  elapsedDays: number;
  totalDays: number;
  budgetUsedPercent: number;
  services: WithFrontServices["services"];
  editMode?: boolean;
}) {
  const fetchReportForIterationPeriod = useFetchReportForIterationPeriod(services);
  const logEntries = services.iterationTriggerService.useBudgetTargetLog(
    iteration.id,
  );

  const billingFormatted = services.formatService.financial.amount(
    billingInIterationCurrency,
    iteration.currency,
  );
  const targetFormatted =
    currentTarget != null
      ? services.formatService.financial.amount(
          currentTarget,
          iteration.currency,
        )
      : null;

  return (
    <div className="space-y-3">
      <div>
        <BudgetUsedVsElapsedBar
          elapsedPercent={elapsedPercent}
          elapsedValue={elapsedDays}
          elapsedTotal={`${totalDays} days`}
          budgetUsedPercent={budgetInTarget > 0 ? budgetUsedPercent : 0}
          budgetUsedValue={billingFormatted}
          budgetUsedTotal={targetFormatted}
        />
      </div>
      <BudgetTargetHistoryChart
        logEntries={logEntries}
        iterationCurrency={iteration.currency}
        formatService={services.formatService}
        periodRange={{
          start: calendarDateToJSDate(iteration.periodStart).getTime(),
          end: calendarDateToJSDate(iteration.periodEnd).getTime(),
        }}
      />
      {editMode && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1.5 pt-4 border-t">
          <BudgetTargetLogEditDialog
            entries={rd.getOrElse(logEntries, () => [])}
            iteration={iteration}
            services={services}
            fetchReportForIterationRange={fetchReportForIterationPeriod}
          />
          <UpdateBudgetTargetForm
            iteration={iteration}
            currentTarget={currentTarget}
            targetCurrency={targetCurrency}
            services={services}
            variant="toolbar"
          />
        </div>
      )}
    </div>
  );
}
