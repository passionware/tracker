import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import { describe, expect, it } from "vitest";
import {
  appendForecastIfNeeded,
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
    iterationId: 1,
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
