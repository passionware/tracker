import {
  addDays,
  eachDayOfInterval,
  isSameDay,
  isWeekend,
  startOfDay,
} from "date-fns";

/** Typical local work window for soft “today” weighting (9:00–18:00). */
const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 18;
const MIN_DAY_UNIT = 0.05;

export type ForecastDayWeightContext = {
  nowMs: number;
  periodStartMs: number;
  /** 0 = no weekend billing assumed; 1 = weekend days count like weekdays. */
  weekendDayWeight: number;
};

/**
 * Fraction of a typical workday elapsed at `nowMs` (0 early morning → 1 after hours).
 * Used so morning snapshots do not count as a full low-productivity day.
 */
export function fractionOfTypicalWorkdayElapsed(nowMs: number): number {
  const d = new Date(nowMs);
  const hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  if (hour <= WORKDAY_START_HOUR) return MIN_DAY_UNIT;
  if (hour >= WORKDAY_END_HOUR) return 1;
  return Math.max(
    MIN_DAY_UNIT,
    (hour - WORKDAY_START_HOUR) / (WORKDAY_END_HOUR - WORKDAY_START_HOUR),
  );
}

export function inclusiveCalendarDayCount(startMs: number, endMs: number): number {
  const start = startOfDay(new Date(Math.min(startMs, endMs)));
  const end = startOfDay(new Date(Math.max(startMs, endMs)));
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).length;
}

export function countWeekendDaysInRange(startMs: number, endMs: number): number {
  const start = startOfDay(new Date(Math.min(startMs, endMs)));
  const end = startOfDay(new Date(Math.max(startMs, endMs)));
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => isWeekend(d)).length;
}

/**
 * Weekend day weight for forecasting: 0 until the iteration has seen a weekend,
 * then inferred from how much billing grew across spans that include weekends.
 */
export function inferWeekendDayWeight(
  points: Array<{ date: number; billing: number }>,
  periodStartMs: number,
  lastMs: number,
): number {
  if (countWeekendDaysInRange(periodStartMs, lastMs) === 0) {
    return 0;
  }
  if (points.length < 2) return 0;

  let weekendAttributedGrowth = 0;
  let totalPositiveGrowth = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const delta = curr.billing - prev.billing;
    if (delta <= 0) continue;
    totalPositiveGrowth += delta;

    const spanCalDays = inclusiveCalendarDayCount(prev.date, curr.date);
    const spanWeekends = countWeekendDaysInRange(prev.date, curr.date);
    if (spanWeekends > 0 && spanCalDays > 0) {
      weekendAttributedGrowth += delta * (spanWeekends / spanCalDays);
    }
  }

  if (totalPositiveGrowth <= 0) return 0;

  const weekendShareOfGrowth = weekendAttributedGrowth / totalPositiveGrowth;
  const firstMs = points[0]!.date;
  const calDays = inclusiveCalendarDayCount(firstMs, lastMs);
  const weekendDays = countWeekendDaysInRange(firstMs, lastMs);
  const weekdayDays = calDays - weekendDays;
  if (weekendDays <= 0 || weekdayDays <= 0) return 0;

  const share = Math.min(0.95, weekendShareOfGrowth);
  if (share <= 0) return 0;
  const w = (share * weekdayDays) / (weekendDays * (1 - share));
  return Math.min(1, Math.max(0, w));
}

function unitWeightForCalendarDay(
  day: Date,
  ctx: ForecastDayWeightContext,
  mode: "full" | "elapsed_through" | "remaining_from",
  lastMs: number,
): number {
  const base = isWeekend(day) ? ctx.weekendDayWeight : 1;
  const isToday = isSameDay(day, new Date(ctx.nowMs));
  const isLastDay = isSameDay(day, new Date(lastMs));

  if (mode === "elapsed_through" && isLastDay && isToday) {
    return base * fractionOfTypicalWorkdayElapsed(ctx.nowMs);
  }
  if (mode === "remaining_from" && isLastDay && isToday) {
    return base * Math.max(0, 1 - fractionOfTypicalWorkdayElapsed(ctx.nowMs));
  }
  return base;
}

/** Weighted billing-day units from `startMs` through `endMs` (inclusive calendar days). */
export function effectiveBillingDayUnits(
  startMs: number,
  endMs: number,
  ctx: ForecastDayWeightContext,
  mode: "full" | "elapsed_through" | "remaining_from",
  lastMs: number,
): number {
  const start = startOfDay(new Date(Math.min(startMs, endMs)));
  const end = startOfDay(new Date(Math.max(startMs, endMs)));
  if (end < start) return 0;

  let total = 0;
  for (const day of eachDayOfInterval({ start, end })) {
    total += unitWeightForCalendarDay(day, ctx, mode, lastMs);
  }
  return total;
}

export function effectiveElapsedBillingDays(
  startMs: number,
  lastMs: number,
  ctx: ForecastDayWeightContext,
): number {
  return Math.max(
    MIN_DAY_UNIT,
    effectiveBillingDayUnits(startMs, lastMs, ctx, "elapsed_through", lastMs),
  );
}

export function effectiveRemainingBillingDays(
  lastMs: number,
  endMs: number,
  ctx: ForecastDayWeightContext,
): number {
  const lastDay = startOfDay(new Date(lastMs));
  const endDay = startOfDay(new Date(endMs));
  if (endDay < lastDay) return 0;

  if (lastDay.getTime() === endDay.getTime()) {
    if (!isSameDay(lastDay, new Date(ctx.nowMs))) return 0;
    return unitWeightForCalendarDay(lastDay, ctx, "remaining_from", lastMs);
  }

  let total = 0;
  if (isSameDay(lastDay, new Date(ctx.nowMs))) {
    total += unitWeightForCalendarDay(lastDay, ctx, "remaining_from", lastMs);
    const nextDay = addDays(lastDay, 1);
    if (nextDay <= endDay) {
      total += effectiveBillingDayUnits(
        nextDay.getTime(),
        endMs,
        ctx,
        "full",
        lastMs,
      );
    }
    return total;
  }

  return effectiveBillingDayUnits(
    addDays(lastDay, 1).getTime(),
    endMs,
    ctx,
    "full",
    lastMs,
  );
}

export function effectiveDayIndexFromOrigin(
  originMs: number,
  instantMs: number,
  ctx: ForecastDayWeightContext,
): number {
  return Math.max(
    0,
    effectiveElapsedBillingDays(originMs, instantMs, ctx) - MIN_DAY_UNIT,
  );
}

export function buildForecastDayContext(
  points: Array<{ date: number; billing: number }>,
  periodStartMs: number,
  lastMs: number,
  nowMs: number,
): ForecastDayWeightContext {
  return {
    nowMs,
    periodStartMs,
    weekendDayWeight: inferWeekendDayWeight(points, periodStartMs, lastMs),
  };
}
