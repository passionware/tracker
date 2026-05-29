import { describe, expect, it } from "vitest";
import {
  buildForecastDayContext,
  effectiveElapsedBillingDays,
  effectiveRemainingBillingDays,
  fractionOfTypicalWorkdayElapsed,
  inferWeekendDayWeight,
} from "./forecast-day-units";

describe("fractionOfTypicalWorkdayElapsed", () => {
  it("is low in the morning and 1 in the evening", () => {
    const morning = Date.parse("2026-05-07T08:00:00");
    const noon = Date.parse("2026-05-07T13:30:00");
    const evening = Date.parse("2026-05-07T19:00:00");
    expect(fractionOfTypicalWorkdayElapsed(morning)).toBeLessThan(0.2);
    expect(fractionOfTypicalWorkdayElapsed(noon)).toBeCloseTo(0.5, 1);
    expect(fractionOfTypicalWorkdayElapsed(evening)).toBe(1);
  });
});

describe("inferWeekendDayWeight", () => {
  const periodStart = Date.parse("2026-05-04T00:00:00");

  it("is 0 before any weekend day in the iteration", () => {
    const last = Date.parse("2026-05-06T18:00:00");
    expect(
      inferWeekendDayWeight(
        [
          { date: periodStart, billing: 0 },
          { date: last, billing: 9_000 },
        ],
        periodStart,
        last,
      ),
    ).toBe(0);
  });

  it("is > 0 when billing jumps across a weekend span", () => {
    const fri = Date.parse("2026-05-08T18:00:00");
    const mon = Date.parse("2026-05-11T10:00:00");
    const w = inferWeekendDayWeight(
      [
        { date: periodStart, billing: 0 },
        { date: fri, billing: 5_000 },
        { date: mon, billing: 12_000 },
      ],
      periodStart,
      mon,
    );
    expect(w).toBeGreaterThan(0.2);
  });
});

describe("effective billing days", () => {
  const periodStart = Date.parse("2026-05-04T00:00:00");

  it("counts only weekdays when no weekend has occurred yet", () => {
    const wed = Date.parse("2026-05-06T18:00:00");
    const ctx = buildForecastDayContext(
      [
        { date: periodStart, billing: 0 },
        { date: wed, billing: 9_000 },
      ],
      periodStart,
      wed,
      wed,
    );
    expect(effectiveElapsedBillingDays(periodStart, wed, ctx)).toBeCloseTo(3, 0);
    expect(
      effectiveRemainingBillingDays(
        wed,
        Date.parse("2026-05-10T23:59:59"),
        ctx,
      ),
    ).toBeCloseTo(2, 0);
  });

  it("soft-includes today when the last snapshot is the same morning", () => {
    const wed = Date.parse("2026-05-06T18:00:00");
    const thuMorning = Date.parse("2026-05-07T09:00:00");
    const nowMs = Date.parse("2026-05-07T10:00:00");
    const ctx = buildForecastDayContext(
      [
        { date: periodStart, billing: 0 },
        { date: wed, billing: 9_000 },
        { date: thuMorning, billing: 9_500 },
      ],
      periodStart,
      thuMorning,
      nowMs,
    );
    const elapsedMorning = effectiveElapsedBillingDays(
      periodStart,
      thuMorning,
      ctx,
    );
    const ctxEvening = buildForecastDayContext(
      [
        { date: periodStart, billing: 0 },
        { date: wed, billing: 9_000 },
        { date: thuMorning, billing: 9_500 },
      ],
      periodStart,
      thuMorning,
      Date.parse("2026-05-07T19:00:00"),
    );
    const elapsedEvening = effectiveElapsedBillingDays(
      periodStart,
      thuMorning,
      ctxEvening,
    );
    expect(elapsedMorning).toBeLessThan(elapsedEvening);
  });
});
