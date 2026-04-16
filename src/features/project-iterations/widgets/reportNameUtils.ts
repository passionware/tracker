import type { CalendarDate } from "@internationalized/date";
import {
  getLocalTimeZone,
  maxDate,
  minDate,
  startOfMonth,
} from "@internationalized/date";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

interface CalendarPeriod {
  start: CalendarDate;
  end: CalendarDate;
}

interface SmartNameParams {
  clientName: string;
  /** Inclusive iteration bounds — drives month label and H1/H2. */
  periodStart?: CalendarDate | null;
  periodEnd?: CalendarDate | null;
  fallback?: string;
}

/**
 * Generate a human-friendly report name that includes the client name,
 * best-fit month (based on coverage), and optional half-of-month suffix.
 *
 * Examples:
 * - "ACME - October'25 H1"
 * - "ACME - December'25 H2"
 * - "ACME - January'25"
 */
export function generateSmartReportName({
  clientName,
  periodStart,
  periodEnd,
  fallback,
}: SmartNameParams): string {
  if (!periodStart || !periodEnd) {
    return fallback ?? `${clientName} - Report`;
  }

  const range: CalendarPeriod = { start: periodStart, end: periodEnd };
  const primaryMonthStart = findPrimaryMonth(range);
  const monthLabel = formatMonth(primaryMonthStart);
  const halfIndicator = detectHalfDescriptor(range, primaryMonthStart);

  return `${clientName} - ${monthLabel}${
    halfIndicator ? ` ${halfIndicator}` : ""
  }`;
}

function findPrimaryMonth(range: CalendarPeriod): CalendarDate {
  const monthCoverages = calculateMonthCoverages(range);
  if (!monthCoverages.length) {
    return startOfMonth(range.start);
  }

  return monthCoverages.reduce((best, current) =>
    current.coverageDays > best.coverageDays ? current : best,
  ).monthStart;
}

function calculateMonthCoverages(range: CalendarPeriod) {
  const coverages: Array<{ monthStart: CalendarDate; coverageDays: number }> =
    [];
  const rangeStartMonth = startOfMonth(range.start);
  const rangeEndMonth = startOfMonth(range.end);

  for (
    let cursor = rangeStartMonth;
    cursor.compare(rangeEndMonth) <= 0;
    cursor = cursor.add({ months: 1 })
  ) {
    const coverageDays = calendarCoverageDays(
      range.start,
      range.end,
      cursor,
    );
    if (coverageDays > 0) {
      coverages.push({ monthStart: cursor.copy(), coverageDays });
    }
  }

  return coverages;
}

/** Half-open overlap between [rangeStart, rangeEndInclusive] and [monthStart, nextMonth). */
function calendarCoverageDays(
  rangeStart: CalendarDate,
  rangeEndInclusive: CalendarDate,
  monthStart: CalendarDate,
): number {
  const calendar = rangeStart.calendar;
  const rangeEndExclusive = rangeEndInclusive.add({ days: 1 });
  const monthEndExclusive = monthStart.add({ months: 1 });

  const overlapStart = maxDate(rangeStart, monthStart)!;
  const overlapEndExclusive = minDate(rangeEndExclusive, monthEndExclusive)!;

  if (overlapEndExclusive.compare(overlapStart) <= 0) {
    return 0;
  }
  return (
    calendar.toJulianDay(overlapEndExclusive) -
    calendar.toJulianDay(overlapStart)
  );
}

function formatMonth(monthStart: CalendarDate): string {
  const monthName = monthFormatter.format(
    monthStart.toDate(getLocalTimeZone()),
  );
  const yearShort = String(monthStart.year).slice(-2);
  return `${monthName}'${yearShort}`;
}

function detectHalfDescriptor(
  range: CalendarPeriod,
  monthStart: CalendarDate,
): "H1" | "H2" | null {
  const sameMonth =
    range.start.year === range.end.year &&
    range.start.month === range.end.month;

  const matchesPrimaryMonth =
    range.start.year === monthStart.year &&
    range.start.month === monthStart.month;

  if (!sameMonth || !matchesPrimaryMonth) {
    return null;
  }

  const startDay = range.start.day;
  const endDay = range.end.day;

  if (endDay <= 15) {
    return "H1";
  }

  if (startDay >= 16) {
    return "H2";
  }

  return null;
}
