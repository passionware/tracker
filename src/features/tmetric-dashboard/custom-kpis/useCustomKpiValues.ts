import { useMemo } from "react";
import { rd } from "@passionware/monads";
import type { WithFrontServices } from "@/core/frontServices";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService";
import { sumCurrencyValuesInTarget } from "@/features/tmetric-dashboard/tmetric-dashboard.utils";
import type { ContractorsSummaryScoped } from "@/features/tmetric-dashboard/tmetric-dashboard.utils";
import {
  CUSTOM_KPI_CURRENCY_VARIABLES,
  type CustomDashboardKpi,
  type CustomKpiVariable,
} from "./customKpi.types";
import { evaluateKpi, type EvaluateResult } from "./customKpiExpression";

export interface CustomKpiEvaluation {
  kpi: CustomDashboardKpi;
  result: EvaluateResult;
}

/**
 * Sum a list of `CurrencyValue` arrays in a chosen base currency, accumulating
 * into a single number. Used to build the scalar variables fed into formulas.
 */
function sumBudgetsInBase(
  budgets: CurrencyValue[][],
  rateMap: Map<string, number>,
  baseCurrency: string,
): number {
  let acc = 0;
  for (const budget of budgets) {
    acc += sumCurrencyValuesInTarget(budget, rateMap, baseCurrency);
  }
  return acc;
}

export function useCustomKpiValues(
  services: WithFrontServices["services"],
  kpis: CustomDashboardKpi[],
  contractorsSummary: ContractorsSummaryScoped | null,
): CustomKpiEvaluation[] {
  const exchangePairs = useMemo(() => {
    if (!contractorsSummary) return [];
    const baseCurrencies = new Set(
      kpis.map((k) => k.baseCurrency.toUpperCase()),
    );
    const sourceCurrencies = new Set<string>();
    for (const c of contractorsSummary.contractors) {
      for (const v of c.costBudget) sourceCurrencies.add(v.currency.toUpperCase());
      for (const v of c.billingBudget) sourceCurrencies.add(v.currency.toUpperCase());
      for (const v of c.earningsBudget) sourceCurrencies.add(v.currency.toUpperCase());
    }
    const pairs: { from: string; to: string }[] = [];
    for (const to of baseCurrencies) {
      for (const from of sourceCurrencies) {
        if (from !== to) pairs.push({ from, to });
      }
    }
    return pairs;
  }, [kpis, contractorsSummary]);

  const exchangeRates = services.exchangeService.useExchangeRates(exchangePairs);

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    const rates = rd.tryMap(exchangeRates, (x) => x) ?? [];
    for (const r of rates) {
      map.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate);
    }
    return map;
  }, [exchangeRates]);

  return useMemo(() => {
    if (!contractorsSummary) {
      return kpis.map((kpi) => ({
        kpi,
        result: { ok: true as const, value: null },
      }));
    }
    const allContractors = contractorsSummary.contractors;
    return kpis.map((kpi) => {
      const base = kpi.baseCurrency.toUpperCase();
      const filterIds = kpi.contractorIds && kpi.contractorIds.length > 0
        ? new Set(kpi.contractorIds)
        : null;
      const scoped = filterIds
        ? allContractors.filter((c) => filterIds.has(c.contractorId))
        : allContractors;

      const vars: Record<CustomKpiVariable, number> = {
        cost: sumBudgetsInBase(scoped.map((c) => c.costBudget), rateMap, base),
        billing: sumBudgetsInBase(scoped.map((c) => c.billingBudget), rateMap, base),
        profit: sumBudgetsInBase(scoped.map((c) => c.earningsBudget), rateMap, base),
        hours: scoped.reduce((s, c) => s + c.totalHours, 0),
        entries: scoped.reduce((s, c) => s + c.entriesCount, 0),
        totalCost: sumBudgetsInBase(allContractors.map((c) => c.costBudget), rateMap, base),
        totalBilling: sumBudgetsInBase(allContractors.map((c) => c.billingBudget), rateMap, base),
        totalProfit: sumBudgetsInBase(allContractors.map((c) => c.earningsBudget), rateMap, base),
        totalHours: allContractors.reduce((s, c) => s + c.totalHours, 0),
        totalEntries: allContractors.reduce((s, c) => s + c.entriesCount, 0),
      };

      // Bail out (return null value) for currency variables we couldn't fully convert
      // because exchange rates are still loading. Compare requested currencies against
      // what we have rates for; if anything is missing, the partial sum would mislead.
      const ratesReady = exchangePairs.every((p) =>
        rateMap.has(`${p.from}->${p.to}`),
      );
      const usesCurrency = Array.from(CUSTOM_KPI_CURRENCY_VARIABLES).some(
        (name) => kpi.formula.includes(name),
      );
      if (usesCurrency && !ratesReady) {
        return {
          kpi,
          result: { ok: true as const, value: null },
        };
      }

      const result = evaluateKpi(kpi.formula, vars);
      return { kpi, result };
    });
  }, [kpis, contractorsSummary, rateMap, exchangePairs]);
}
