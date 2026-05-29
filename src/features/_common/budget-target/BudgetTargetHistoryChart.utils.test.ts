import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import { describe, expect, it } from "vitest";
import {
  buildForecastDayContext,
  effectiveRemainingBillingDays,
} from "@/platform/lang/forecast-day-units.ts";
import {
  buildChartData,
  computeForecastValueAt,
  logEntriesToRawData,
} from "./BudgetTargetHistoryChart.utils";

function entry(
  createdAt: Date,
  billingSnapshotAmount: number | null,
): BudgetTargetLogEntry {
  return {
    id: createdAt.getTime(),
    projectIterationId: 1,
    createdAt,
    newTargetAmount: null,
    billingSnapshotAmount,
    billingSnapshotCurrency: "EUR",
  };
}

describe("logEntriesToRawData", () => {
  it("enforces non-decreasing billing even when snapshots dip", () => {
    const raw = logEntriesToRawData(
      [
        entry(new Date("2026-05-01T23:59:00"), 1000),
        entry(new Date("2026-05-10T23:59:00"), 800),
        entry(new Date("2026-05-15T23:59:00"), 1200),
      ],
      "EUR",
    );
    expect(raw.map((r) => r.billing)).toEqual([1000, 1000, 1200]);
  });
});

describe("computeForecastValueAt", () => {
  const scenarioPoints = [
    { date: Date.parse("2026-04-25"), billing: 0 },
    { date: Date.parse("2026-05-10"), billing: 10_000 },
    { date: Date.parse("2026-05-21"), billing: 19_269 },
  ];
  const scenarioEnd = Date.parse("2026-05-25");

  it("never forecasts below the last observed cumulative billing", () => {
    const forecast = computeForecastValueAt(scenarioPoints, scenarioEnd);
    expect(forecast).not.toBeNull();
    expect(forecast!).toBeGreaterThanOrEqual(19_269);
  });

  it("continues upward when regression would flatten at the last point", () => {
    const forecast = computeForecastValueAt(scenarioPoints, scenarioEnd);
    expect(forecast!).toBeGreaterThan(19_269);
  });

  it("does not extrapolate weekend calendar time when no weekend has elapsed yet", () => {
    const periodStart = Date.parse("2026-05-04T00:00:00");
    const periodEnd = Date.parse("2026-05-10T23:59:59");
    const wed = Date.parse("2026-05-06T18:00:00");
    const points = [
      { date: periodStart, billing: 0 },
      { date: wed, billing: 9_000 },
    ];
    const forecast = computeForecastValueAt(points, periodEnd, {
      periodStartMs: periodStart,
      nowMs: wed,
    });
    expect(forecast).not.toBeNull();
    // Wed snapshot: 3 elapsed weekdays (Mon–Wed), 2 remaining (Thu–Fri) → +6k, not +18k from calendar ms.
    expect(forecast!).toBeLessThan(18_000);
    expect(forecast!).toBeGreaterThan(14_000);
    expect(forecast!).toBeCloseTo(15_000, -2);
  });

  it("counts future weekend days when billing already grew across a weekend", () => {
    const periodStart = Date.parse("2026-05-04T00:00:00");
    const periodEnd = Date.parse("2026-05-17T23:59:59");
    const fri = Date.parse("2026-05-08T18:00:00");
    const mon = Date.parse("2026-05-11T12:00:00");
    const points = [
      { date: periodStart, billing: 0 },
      { date: fri, billing: 5_000 },
      { date: mon, billing: 12_000 },
    ];
    const ctx = buildForecastDayContext(points, periodStart, mon, mon);
    expect(ctx.weekendDayWeight).toBeGreaterThan(0.15);
    const remaining = effectiveRemainingBillingDays(mon, periodEnd, ctx);
    const remainingWeekdaysOnly = effectiveRemainingBillingDays(mon, periodEnd, {
      ...ctx,
      weekendDayWeight: 0,
    });
    expect(remaining).toBeGreaterThan(remainingWeekdaysOnly);
  });

  it("does not treat a full morning as a complete low-productivity day", () => {
    const periodStart = Date.parse("2026-05-04T00:00:00");
    const periodEnd = Date.parse("2026-05-10T23:59:59");
    const wed = Date.parse("2026-05-06T18:00:00");
    const thuMorning = Date.parse("2026-05-07T09:00:00");
    const points = [
      { date: periodStart, billing: 0 },
      { date: wed, billing: 9_000 },
      { date: thuMorning, billing: 9_500 },
    ];
    const morningNow = Date.parse("2026-05-07T10:00:00");
    const eveningNow = Date.parse("2026-05-07T19:00:00");
    const forecastMorning = computeForecastValueAt(points, periodEnd, {
      periodStartMs: periodStart,
      nowMs: morningNow,
    });
    const forecastEvening = computeForecastValueAt(points, periodEnd, {
      periodStartMs: periodStart,
      nowMs: eveningNow,
    });
    expect(forecastMorning!).toBeGreaterThan(forecastEvening!);
  });
});

describe("appendForecastIfNeeded", () => {
  it("keeps forecast segment flat or rising through period end", () => {
    const entries = [
      entry(new Date("2026-04-25T23:59:00"), 0),
      entry(new Date("2026-05-10T23:59:00"), 10_000),
      entry(new Date("2026-05-21T23:59:00"), 19_269),
    ];
    const periodEnd = Date.parse("2026-05-25T23:59:59");
    const data = buildChartData(entries, "EUR", {
      start: Date.parse("2026-04-25"),
      end: periodEnd,
    });
    const withForecast = data.filter((d) => d.forecast != null);
    expect(withForecast.length).toBeGreaterThanOrEqual(2);
    const forecasts = withForecast.map((d) => d.forecast!);
    for (let i = 1; i < forecasts.length; i++) {
      expect(forecasts[i]).toBeGreaterThanOrEqual(forecasts[i - 1]!);
    }
    expect(forecasts[forecasts.length - 1]!).toBeGreaterThanOrEqual(19_269);
  });
});
