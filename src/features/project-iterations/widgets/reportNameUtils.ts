import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

export interface ReportDateRange {
  start: Date;
  end: Date;
}

/**
 * Extract the overall start/end range from a report's time entries.
 */
export function getReportDateRange(
  report: GeneratedReportSource,
): ReportDateRange | null {
  const entries = report.data.timeEntries;
  if (!entries.length) {
    return null;
  }

  const start = entries.reduce(
    (min, entry) => (entry.startAt < min ? entry.startAt : min),
    entries[0].startAt,
  );
  const end = entries.reduce(
    (max, entry) => (entry.endAt > max ? entry.endAt : max),
    entries[0].endAt,
  );

  return { start, end };
}

interface SmartNameParams {
  clientName: string;
  report?: GeneratedReportSource;
  range?: ReportDateRange | null;
  fallback?: string;
}

/**
 * Generate a human-friendly report name that includes the client name,
 * best-fit month (based on coverage), and optional half-of-month suffix.
 *
 * Examples:
 * - "Countful - October'25 H1"
 * - "Countful - December'25 H2"
 * - "Atelltio - January'25"
 */
export function generateSmartReportName({
  clientName,
  report,
  range,
  fallback,
}: SmartNameParams): string {
  const resolvedRange = range ?? (report ? getReportDateRange(report) : null);

  if (!resolvedRange) {
    return fallback ?? `${clientName} - Report`;
  }

  const normalizedRange = normalizeRange(resolvedRange);
  const primaryMonthStart = findPrimaryMonth(normalizedRange);
  const monthLabel = formatMonth(primaryMonthStart);
  const halfIndicator = detectHalfDescriptor(normalizedRange, primaryMonthStart);

  return `${clientName} - ${monthLabel}${
    halfIndicator ? ` ${halfIndicator}` : ""
  }`;
}

function normalizeRange(range: ReportDateRange): ReportDateRange {
  return {
    start: startOfDay(range.start),
    end: startOfDay(range.end),
  };
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function startOfMonth(date: Date): Date {
  const normalized = startOfDay(date);
  normalized.setDate(1);
  return normalized;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function findPrimaryMonth(range: ReportDateRange): Date {
  const monthCoverages = calculateMonthCoverages(range);
  if (!monthCoverages.length) {
    return startOfMonth(range.start);
  }

  return monthCoverages.reduce((best, current) =>
    current.coverageMs > best.coverageMs ? current : best,
  ).monthStart;
}

function calculateMonthCoverages(range: ReportDateRange) {
  const coverages: Array<{ monthStart: Date; coverageMs: number }> = [];
  const rangeStartMonth = startOfMonth(range.start);
  const rangeEndMonth = startOfMonth(range.end);
  const endExclusive = addDays(range.end, 1); // make end inclusive

  for (
    let cursor = new Date(rangeStartMonth);
    cursor <= rangeEndMonth;
    cursor = addMonths(cursor, 1)
  ) {
    const monthStart = cursor;
    const monthEndExclusive = addMonths(monthStart, 1);
    const overlapStart =
      range.start > monthStart ? range.start : monthStart;
    const overlapEnd =
      endExclusive < monthEndExclusive ? endExclusive : monthEndExclusive;
    const overlapMs = Math.max(0, overlapEnd.getTime() - overlapStart.getTime());

    if (overlapMs > 0) {
      coverages.push({ monthStart: new Date(monthStart), coverageMs: overlapMs });
    }
  }

  return coverages;
}

function formatMonth(monthStart: Date): string {
  const monthName = monthFormatter.format(monthStart);
  const yearShort = String(monthStart.getFullYear()).slice(-2);
  return `${monthName}'${yearShort}`;
}

function detectHalfDescriptor(
  range: ReportDateRange,
  monthStart: Date,
): "H1" | "H2" | null {
  const sameMonth =
    range.start.getFullYear() === range.end.getFullYear() &&
    range.start.getMonth() === range.end.getMonth();

  const matchesPrimaryMonth =
    range.start.getFullYear() === monthStart.getFullYear() &&
    range.start.getMonth() === monthStart.getMonth();

  if (!sameMonth || !matchesPrimaryMonth) {
    return null;
  }

  const startDay = range.start.getDate();
  const endDay = range.end.getDate();

  if (endDay <= 15) {
    return "H1";
  }

  if (startDay >= 16) {
    return "H2";
  }

  return null;
}

