import {
  differenceInMilliseconds,
  max as maxDate,
  min as minDate,
} from "date-fns";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PeriodProgress {
  /** Total duration of the period in ms */
  totalMs: number;
  /** Elapsed duration from period start to now (clamped to period), in ms */
  elapsedMs: number;
  /** Elapsed duration in whole days (rounded) */
  elapsedDays: number;
  /** Total period duration in whole days (rounded) */
  totalDays: number;
  /** Elapsed percentage 0–100 */
  elapsedPercent: number;
}

/**
 * Computes progress of "now" through a date range [start, end].
 * If now is before start, elapsed is 0; if now is after end, elapsed is capped at end.
 */
export function computePeriodProgress(
  start: Date,
  end: Date,
  now: Date = new Date(),
): PeriodProgress {
  const totalMs = differenceInMilliseconds(end, start);
  const clampedNow = minDate([maxDate([now, start]), end]);
  const elapsedMs = differenceInMilliseconds(clampedNow, start);
  const elapsedDays = Math.round(elapsedMs / MS_PER_DAY);
  const totalDays = Math.round(totalMs / MS_PER_DAY);
  const elapsedPercent = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
  return {
    totalMs,
    elapsedMs,
    elapsedDays,
    totalDays,
    elapsedPercent,
  };
}
