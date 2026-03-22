import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { inclusiveCalendarPeriodToEpochRange } from "@/platform/lang/internationalized-date.ts";
import { format } from "date-fns";

export type ChartDatum = {
  date: number;
  dateLabel: string;
  target: number | null;
  billing: number | null;
  billingCurrency: string;
  /** Extrapolated billing at period end (dashed line); only on last real point and synthetic end point. */
  forecast?: number | null;
};

/**
 * Map log entries to raw chart rows. Carries forward last known billing when snapshot is null.
 */
export function logEntriesToRawData(
  entries: BudgetTargetLogEntry[],
  iterationCurrency: string,
): Omit<ChartDatum, "forecast">[] {
  let lastBilling: number | null = null;
  return entries.map((e) => {
    const billing = e.billingSnapshotAmount ?? lastBilling ?? 0;
    if (e.billingSnapshotAmount != null) lastBilling = e.billingSnapshotAmount;
    return {
      date: e.createdAt.getTime(),
      dateLabel: format(e.createdAt, "MMM d, HH:mm"),
      target: e.newTargetAmount ?? null,
      billing,
      billingCurrency: e.billingSnapshotCurrency ?? iterationCurrency,
    };
  });
}

/**
 * Fill target gaps: first row gets first non-null target, last row gets last non-null target (for step-after area).
 */
export function fillTargetSteps(
  rawData: Omit<ChartDatum, "forecast">[],
): ChartDatum[] {
  if (rawData.length === 0) return [];
  const firstNonNullTarget =
    rawData.find((d) => d.target != null)?.target ?? null;
  const lastNonNullTarget =
    [...rawData].reverse().find((d) => d.target != null)?.target ?? null;
  return rawData.map((row, i) => ({
    ...row,
    target:
      row.target ??
      (i === 0
        ? firstNonNullTarget
        : i === rawData.length - 1
          ? lastNonNullTarget
          : null),
  }));
}

/**
 * Linear regression: forecast value at endDate from points (date, billing).
 */
export function computeForecastValueAt(
  points: Array<{ date: number; billing: number }>,
  endDate: number,
): number | null {
  if (points.length < 1) return null;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.date;
    sumY += p.billing;
    sumXY += p.date * p.billing;
    sumXX += p.date * p.date;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, slope * endDate + intercept);
}

/**
 * If periodRange extends beyond last data point, append a forecast segment and synthetic end point.
 */
export function appendForecastIfNeeded(
  data: ChartDatum[],
  periodRange: { start: number; end: number },
): ChartDatum[] {
  const lastRow = data[data.length - 1];
  if (
    !lastRow ||
    periodRange.end <= lastRow.date
  )
    return data;

  let forecastEndValue: number | null = null;
  if (lastRow.billing != null) {
    const points = data.filter(
      (d): d is ChartDatum & { billing: number } => d.billing != null,
    );
    forecastEndValue =
      points.length >= 1
        ? computeForecastValueAt(
            points.map((p) => ({ date: p.date, billing: p.billing })),
            periodRange.end,
          )
        : lastRow.billing;
  }

  const lastRowWithForecast: ChartDatum =
    forecastEndValue != null
      ? { ...lastRow, forecast: lastRow.billing ?? undefined }
      : lastRow;
  const syntheticPoint: ChartDatum = {
    date: periodRange.end,
    dateLabel: format(new Date(periodRange.end), "MMM d, HH:mm"),
    target: lastRow.target,
    billing: null,
    billingCurrency: lastRow.billingCurrency,
    ...(forecastEndValue != null && { forecast: forecastEndValue }),
  };
  return [...data.slice(0, -1), lastRowWithForecast, syntheticPoint];
}

/**
 * Build full chart data from log entries (raw → fill target → optional forecast).
 */
export function buildChartData(
  entries: BudgetTargetLogEntry[],
  iterationCurrency: string,
  periodRange?: { start: number; end: number },
): ChartDatum[] {
  const raw = logEntriesToRawData(entries, iterationCurrency);
  let data = fillTargetSteps(raw);
  if (periodRange != null) {
    data = appendForecastIfNeeded(data, periodRange);
  }
  return data;
}

function collectNumericSeriesValues(data: ChartDatum[]): number[] {
  const out: number[] = [];
  for (const row of data) {
    for (const v of [row.target, row.billing, row.forecast]) {
      if (v != null && Number.isFinite(v)) out.push(v);
    }
  }
  return out;
}

/**
 * Single shared Y domain for several iteration budget charts in the same lane
 * (same numeric scale; assumes values are comparable like same workspace currency context).
 */
export function computeSharedBudgetChartYDomain(
  iterationIds: readonly ProjectIteration["id"][],
  entriesByIterationId: ReadonlyMap<
    ProjectIteration["id"],
    BudgetTargetLogEntry[]
  >,
  iterationById: ReadonlyMap<
    ProjectIteration["id"],
    Pick<ProjectIteration, "currency" | "periodStart" | "periodEnd">
  >,
): [number, number] | null {
  const values: number[] = [];
  for (const id of iterationIds) {
    const entries = entriesByIterationId.get(id);
    const it = iterationById.get(id);
    if (!entries?.length || !it) continue;
    const periodRange = inclusiveCalendarPeriodToEpochRange(
      it.periodStart,
      it.periodEnd,
    );
    const data = buildChartData(entries, it.currency, periodRange);
    values.push(...collectNumericSeriesValues(data));
  }
  if (values.length === 0) return null;
  const minv = Math.min(...values);
  const maxv = Math.max(...values);
  const span = maxv - minv;
  const pad =
    span > 0 ? span * 0.06 : Math.max(Math.abs(minv) * 0.08, 1);
  return [Math.max(0, minv - pad), maxv + pad];
}
