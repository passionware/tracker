import { CalendarDate, startOfMonth } from "@internationalized/date";

function endOfCalendarMonth(d: CalendarDate): CalendarDate {
  return startOfMonth(d.add({ months: 1 })).subtract({ days: 1 });
}

function sameCalendarMonth(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month;
}

function calendarDatesEqual(a: CalendarDate, b: CalendarDate): boolean {
  return a.compare(b) === 0;
}

/** Inclusive day count from start through end (requires start <= end). */
export function inclusiveCalendarDayCount(
  start: CalendarDate,
  end: CalendarDate,
): number {
  let n = 0;
  let d = start;
  while (d.compare(end) <= 0) {
    n++;
    d = d.add({ days: 1 });
  }
  return n;
}

/**
 * True when `end` is exactly one calendar month after `start`, minus one day
 * (e.g. Jan 25 → Feb 24, Feb 25 → Mar 24).
 */
export function matchesMonthShiftPattern(
  start: CalendarDate,
  end: CalendarDate,
): boolean {
  const expected = start.add({ months: 1 }).subtract({ days: 1 });
  return calendarDatesEqual(end, expected);
}

function inferDominantInvoiceDayOfMonth(
  dates: readonly CalendarDate[],
): number | null {
  if (dates.length < 2) return null;
  const counts = new Map<number, number>();
  for (const d of dates) {
    counts.set(d.day, (counts.get(d.day) ?? 0) + 1);
  }
  let bestDay = 0;
  let bestCount = 0;
  for (const [day, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      bestDay = day;
    }
  }
  if (bestCount / dates.length >= 0.65) {
    return bestDay;
  }
  return null;
}

/**
 * Suggests the next iteration's inclusive calendar period after the given one closes,
 * using semi-monthly, month-shift, bi-weekly, invoice-day, or fixed-length heuristics.
 */
export function suggestNextIterationPeriod(input: {
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  /** Client invoice dates (optional) to reinforce monthly anchor patterns. */
  invoiceDates?: readonly CalendarDate[];
}): { periodStart: CalendarDate; periodEnd: CalendarDate } {
  const { periodStart, periodEnd } = input;
  const invoiceDates = input.invoiceDates ?? [];

  // Calendar month, first half (1–15).
  if (
    periodStart.day === 1 &&
    periodEnd.day === 15 &&
    sameCalendarMonth(periodStart, periodEnd)
  ) {
    const nextStart = periodStart.add({ days: 15 });
    const nextEnd = endOfCalendarMonth(periodStart);
    return { periodStart: nextStart, periodEnd: nextEnd };
  }

  // Calendar month, second half (16 – end of month).
  if (
    periodStart.day === 16 &&
    sameCalendarMonth(periodStart, periodEnd) &&
    calendarDatesEqual(periodEnd, endOfCalendarMonth(periodStart))
  ) {
    const nextMonthFirst = startOfMonth(periodStart.add({ months: 1 }));
    const nextEnd = nextMonthFirst.add({ days: 14 });
    return { periodStart: nextMonthFirst, periodEnd: nextEnd };
  }

  if (matchesMonthShiftPattern(periodStart, periodEnd)) {
    const nextStart = periodEnd.add({ days: 1 });
    const nextEnd = nextStart.add({ months: 1 }).subtract({ days: 1 });
    return { periodStart: nextStart, periodEnd: nextEnd };
  }

  const span = inclusiveCalendarDayCount(periodStart, periodEnd);
  const anchorDay = inferDominantInvoiceDayOfMonth(invoiceDates);
  if (
    anchorDay != null &&
    periodStart.day === anchorDay &&
    span >= 27 &&
    span <= 31
  ) {
    const nextStart = periodEnd.add({ days: 1 });
    const nextEnd = nextStart.add({ months: 1 }).subtract({ days: 1 });
    return { periodStart: nextStart, periodEnd: nextEnd };
  }

  if (span === 14) {
    const nextStart = periodEnd.add({ days: 1 });
    const nextEnd = nextStart.add({ days: 13 });
    return { periodStart: nextStart, periodEnd: nextEnd };
  }

  const nextStart = periodEnd.add({ days: 1 });
  const nextEnd = nextStart.add({ days: span - 1 });
  return { periodStart: nextStart, periodEnd: nextEnd };
}
