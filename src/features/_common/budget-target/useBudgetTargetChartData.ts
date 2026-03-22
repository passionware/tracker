import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import { rd, type RemoteData } from "@passionware/monads";
import {
  buildChartData,
  type ChartDatum,
} from "./BudgetTargetHistoryChart.utils";

export interface UseBudgetTargetChartDataParams {
  logEntries: RemoteData<BudgetTargetLogEntry[]>;
  iterationCurrency: string;
  periodRange?: { start: number; end: number };
  /** When set (e.g. lane-normalized timeline), fixes Y scale across sibling charts. */
  yDomain?: [number, number] | null;
}

export interface BudgetTargetChartResult {
  /** Resolved when logEntries is success and non-empty. */
  data: ChartDatum[];
  xDomain: [number, number] | ["dataMin", "dataMax"];
  /** Last real (non-synthetic) point date; for ReferenceArea. */
  lastRealDataDate: number | null;
  hasForecast: boolean;
  isEmpty: boolean;
  yDomain?: [number, number];
}

function getResult(
  entries: BudgetTargetLogEntry[],
  iterationCurrency: string,
  periodRange?: { start: number; end: number },
): BudgetTargetChartResult {
  if (entries.length === 0) {
    return {
      data: [],
      xDomain: ["dataMin", "dataMax"],
      lastRealDataDate: null,
      hasForecast: false,
      isEmpty: true,
    };
  }
  const data = buildChartData(entries, iterationCurrency, periodRange);
  const xDomain: [number, number] | ["dataMin", "dataMax"] =
    periodRange != null
      ? [periodRange.start, periodRange.end]
      : ["dataMin", "dataMax"];
  const hasForecast =
    periodRange != null &&
    data.length >= 2 &&
    data[data.length - 1].date === periodRange.end &&
    data[data.length - 1].forecast != null;
  const lastRealDataDate = hasForecast
    ? data[data.length - 2]?.date ?? null
    : data[data.length - 1]?.date ?? null;
  return {
    data,
    xDomain,
    lastRealDataDate,
    hasForecast,
    isEmpty: false,
  };
}

/**
 * Derives chart data and domain from budget target log entries. Uses pure helpers from BudgetTargetHistoryChart.utils.
 */
export function useBudgetTargetChartData({
  logEntries,
  iterationCurrency,
  periodRange,
  yDomain,
}: UseBudgetTargetChartDataParams): RemoteData<BudgetTargetChartResult> {
  return rd.map(logEntries, (entries) => {
    const base = getResult(entries, iterationCurrency, periodRange);
    return yDomain != null
      ? { ...base, yDomain }
      : base;
  });
}
