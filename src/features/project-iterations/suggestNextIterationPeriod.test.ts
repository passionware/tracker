import { CalendarDate } from "@internationalized/date";
import { describe, expect, it } from "vitest";
import {
  inclusiveCalendarDayCount,
  matchesMonthShiftPattern,
  suggestNextIterationPeriod,
} from "@/features/project-iterations/suggestNextIterationPeriod.ts";

describe("matchesMonthShiftPattern", () => {
  it("detects 25th to 24th next month", () => {
    const start = new CalendarDate(2025, 1, 25);
    const end = new CalendarDate(2025, 2, 24);
    expect(matchesMonthShiftPattern(start, end)).toBe(true);
  });
});

describe("suggestNextIterationPeriod", () => {
  it("continues month-shift cadence (Jan 25 – Feb 24 → Feb 25 – Mar 24)", () => {
    const next = suggestNextIterationPeriod({
      periodStart: new CalendarDate(2025, 1, 25),
      periodEnd: new CalendarDate(2025, 2, 24),
    });
    expect(next.periodStart).toEqual(new CalendarDate(2025, 2, 25));
    expect(next.periodEnd).toEqual(new CalendarDate(2025, 3, 24));
  });

  it("handles first calendar half (1–15 → 16 – EOM)", () => {
    const next = suggestNextIterationPeriod({
      periodStart: new CalendarDate(2025, 3, 1),
      periodEnd: new CalendarDate(2025, 3, 15),
    });
    expect(next.periodStart).toEqual(new CalendarDate(2025, 3, 16));
    expect(next.periodEnd).toEqual(new CalendarDate(2025, 3, 31));
  });

  it("handles second calendar half (16 – EOM → next 1–15)", () => {
    const next = suggestNextIterationPeriod({
      periodStart: new CalendarDate(2025, 1, 16),
      periodEnd: new CalendarDate(2025, 1, 31),
    });
    expect(next.periodStart).toEqual(new CalendarDate(2025, 2, 1));
    expect(next.periodEnd).toEqual(new CalendarDate(2025, 2, 15));
  });

  it("handles 14-day span as bi-weekly", () => {
    const next = suggestNextIterationPeriod({
      periodStart: new CalendarDate(2025, 4, 1),
      periodEnd: new CalendarDate(2025, 4, 14),
    });
    expect(inclusiveCalendarDayCount(next.periodStart, next.periodEnd)).toBe(
      14,
    );
    expect(next.periodStart).toEqual(new CalendarDate(2025, 4, 15));
    expect(next.periodEnd).toEqual(new CalendarDate(2025, 4, 28));
  });

  it("falls back to preserving inclusive length", () => {
    const next = suggestNextIterationPeriod({
      periodStart: new CalendarDate(2025, 6, 10),
      periodEnd: new CalendarDate(2025, 6, 19),
    });
    expect(inclusiveCalendarDayCount(next.periodStart, next.periodEnd)).toBe(
      10,
    );
    expect(next.periodStart).toEqual(new CalendarDate(2025, 6, 20));
    expect(next.periodEnd).toEqual(new CalendarDate(2025, 6, 29));
  });

  it("uses invoice anchor for ~monthly span when geometry is irregular", () => {
    const inv = [
      new CalendarDate(2024, 11, 25),
      new CalendarDate(2025, 1, 25),
      new CalendarDate(2025, 2, 25),
    ];
    const next = suggestNextIterationPeriod({
      periodStart: new CalendarDate(2025, 1, 25),
      periodEnd: new CalendarDate(2025, 2, 20),
      invoiceDates: inv,
    });
    expect(next.periodStart).toEqual(new CalendarDate(2025, 2, 21));
    expect(next.periodEnd).toEqual(
      new CalendarDate(2025, 2, 21).add({ months: 1 }).subtract({ days: 1 }),
    );
  });
});
