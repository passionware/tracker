import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { WithFrontServices } from "@/core/frontServices";
import type { GenericReport } from "@/services/io/_common/GenericReport";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { useCallback } from "react";
import { getReportBillingCurrencies } from "./tmetric-dashboard.utils";

function rateKey(from: string, to: string): string {
  return `${from.toUpperCase()}->${to.toUpperCase()}`;
}

export interface FetchReportForIterationPeriodResult {
  reportData: GenericReport;
  rateMap: Map<string, number>;
}

/**
 * Returns a function that fetches TMetric report for the given iteration's full period
 * (ignoring current dashboard scope). Use when writing to budget log so billing snapshots
 * are always based on full iteration range.
 */
export function useFetchReportForIterationPeriod(
  services: WithFrontServices["services"],
): (iteration: ProjectIteration) => Promise<FetchReportForIterationPeriodResult | null> {
  const { tmetricDashboardService, exchangeService } = services;

  return useCallback(
    async (iteration: ProjectIteration): Promise<FetchReportForIterationPeriodResult | null> => {
      const periodStart = calendarDateToJSDate(iteration.periodStart);
      const periodEnd = calendarDateToJSDate(iteration.periodEnd);
      const entry = await tmetricDashboardService.refreshAndCache({
        scope: { projectIterationIds: [iteration.id] },
        periodStart,
        periodEnd,
      });
      const report = entry.data;
      const reportCurrencies = getReportBillingCurrencies(report);
      const rateMap = new Map<string, number>();
      for (const from of reportCurrencies) {
        const key = rateKey(from, iteration.currency);
        try {
          const rate = await exchangeService.ensureExchange(from, iteration.currency, 1);
          rateMap.set(key, rate);
        } catch {
          // leave missing – sumCurrencyValuesInTarget will use 0
        }
      }
      return { reportData: report, rateMap };
    },
    [tmetricDashboardService, exchangeService],
  );
}
