import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import type { Project } from "@/api/project/project.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WithFrontServices } from "@/core/frontServices";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import type { GenericReport } from "@/services/io/_common/GenericReport";
import { maybe, rd, type RemoteData } from "@passionware/monads";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildScopeHierarchy,
  divideCurrencyValues,
  getContractorIterationTotals,
  getContractorRatesForIterationProject,
  getScopeHierarchyTotals,
  sumCurrencyValues,
  sumCurrencyValuesInTarget,
  type ContractorRateInProject,
} from "./tmetric-dashboard.utils";
import { ProfitBreakdownWidget } from "./ProfitBreakdownWidget";

export type { ContractorRateInProject };

const SCOPE_EXPANDED_STORAGE_KEY_PREFIX = "tmetric-scope-expanded";

export interface TmetricScopeHierarchyPanelProps {
  services: WithFrontServices["services"];
  projectsData: RemoteData<Project[]>;
  iterationsForScope: ProjectIteration[];
  projectsMap: Map<number, { name: string }>;
  /** When present (cached report loaded), contractor rates per project are shown. */
  cachedReport?: { data: GenericReport } | null;
  /** When set, expand/collapse state is persisted to localStorage under this key (e.g. workspaceId-clientId). */
  persistenceKey?: string;
}

export function TmetricScopeHierarchyPanel({
  services,
  projectsData,
  iterationsForScope,
  projectsMap,
  cachedReport = null,
  persistenceKey,
}: TmetricScopeHierarchyPanelProps) {
  const scopeHierarchy = useMemo(
    () => buildScopeHierarchy(projectsData, iterationsForScope, projectsMap),
    [projectsData, iterationsForScope, projectsMap],
  );

  const scopeHierarchyWithRates = useMemo(() => {
    return scopeHierarchy.map((client) => ({
      ...client,
      iterations: client.iterations.map((row) => ({
        ...row,
        contractorsWithRates: cachedReport?.data
          ? getContractorRatesForIterationProject(
              cachedReport.data,
              row.iteration.id,
              row.iteration.projectId,
            )
          : [],
      })),
    }));
  }, [scopeHierarchy, cachedReport]);

  const scopeHierarchyTotals = useMemo(() => {
    if (!cachedReport?.data) return null;
    return getScopeHierarchyTotals(cachedReport.data, scopeHierarchyWithRates);
  }, [cachedReport, scopeHierarchyWithRates]);

  const targetCurrency = "EUR";
  const allCurrenciesForExchange = useMemo(() => {
    const set = new Set<string>();
    if (scopeHierarchyTotals) {
      for (const [, rec] of scopeHierarchyTotals.byClient)
        for (const v of [...rec.cost, ...rec.billing])
          set.add(v.currency.toUpperCase());
      for (const [, rec] of scopeHierarchyTotals.byIteration)
        for (const v of [...rec.cost, ...rec.billing])
          set.add(v.currency.toUpperCase());
    }
    if (cachedReport?.data)
      for (const row of scopeHierarchyWithRates.flatMap((c) => c.iterations)) {
        const totals = getContractorIterationTotals(
          cachedReport.data,
          row.iteration.id,
        );
        for (const t of totals) {
          set.add(t.costCurrency.toUpperCase());
          set.add(t.billingCurrency.toUpperCase());
        }
      }
    return set.size ? Array.from(set) : ["EUR"];
  }, [scopeHierarchyTotals, scopeHierarchyWithRates, cachedReport]);

  const exchangeRates = services.exchangeService.useExchangeRates(
    allCurrenciesForExchange.map((from) => ({ from, to: targetCurrency })),
  );

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    const rates = rd.tryMap(exchangeRates, (x) => x) ?? [];
    for (const r of rates)
      map.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate);
    return map;
  }, [exchangeRates]);

  const profitInTargetByClient = useMemo(() => {
    if (!scopeHierarchyTotals || rateMap.size === 0)
      return new Map<number, { amount: number; currency: string }[]>();
    const m = new Map<number, { amount: number; currency: string }[]>();
    for (const [clientId, rec] of scopeHierarchyTotals.byClient) {
      const profit =
        sumCurrencyValuesInTarget(rec.billing, rateMap, targetCurrency) -
        sumCurrencyValuesInTarget(rec.cost, rateMap, targetCurrency);
      m.set(clientId, [{ amount: profit, currency: targetCurrency }]);
    }
    return m;
  }, [scopeHierarchyTotals, rateMap]);

  const profitInTargetByIteration = useMemo(() => {
    if (!scopeHierarchyTotals || rateMap.size === 0)
      return new Map<number, { amount: number; currency: string }[]>();
    const m = new Map<number, { amount: number; currency: string }[]>();
    for (const [iterId, rec] of scopeHierarchyTotals.byIteration) {
      const profit =
        sumCurrencyValuesInTarget(rec.billing, rateMap, targetCurrency) -
        sumCurrencyValuesInTarget(rec.cost, rateMap, targetCurrency);
      m.set(iterId, [{ amount: profit, currency: targetCurrency }]);
    }
    return m;
  }, [scopeHierarchyTotals, rateMap]);

  const contractorProfitInTarget = useMemo(() => {
    if (!cachedReport?.data || rateMap.size === 0)
      return new Map<string, number>();
    const m = new Map<string, number>();
    for (const row of scopeHierarchyWithRates.flatMap((c) => c.iterations)) {
      const totals = getContractorIterationTotals(
        cachedReport.data,
        row.iteration.id,
      );
      for (const t of totals) {
        const billingInTarget = sumCurrencyValuesInTarget(
          [{ amount: t.totalBilling, currency: t.billingCurrency }],
          rateMap,
          targetCurrency,
        );
        const costInTarget = sumCurrencyValuesInTarget(
          [{ amount: t.totalCost, currency: t.costCurrency }],
          rateMap,
          targetCurrency,
        );
        m.set(
          `${row.iteration.id}-${t.contractorId}`,
          billingInTarget - costInTarget,
        );
      }
    }
    return m;
  }, [cachedReport, scopeHierarchyWithRates, rateMap]);

  const allClientIds = useMemo(
    () => scopeHierarchyWithRates.map((c) => c.clientId),
    [scopeHierarchyWithRates],
  );
  const allIterationIds = useMemo(
    () =>
      scopeHierarchyWithRates.flatMap((c) =>
        c.iterations.map((i) => i.iteration.id),
      ),
    [scopeHierarchyWithRates],
  );
  const [expandedClients, setExpandedClients] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!persistenceKey) {
      setExpandedClients(new Set());
      setExpandedIterations(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(
        `${SCOPE_EXPANDED_STORAGE_KEY_PREFIX}-${persistenceKey}`,
      );
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        clientIds?: number[];
        iterationIds?: number[];
      };
      const storedClients = new Set(parsed.clientIds ?? []);
      const storedIterations = new Set(parsed.iterationIds ?? []);
      setExpandedClients(
        new Set(allClientIds.filter((id) => storedClients.has(id))),
      );
      setExpandedIterations(
        new Set(allIterationIds.filter((id) => storedIterations.has(id))),
      );
    } catch {
      // ignore invalid stored data
    }
  }, [persistenceKey, allClientIds, allIterationIds]);

  const persistExpandedState = useCallback(
    (clients: Set<number>, iterations: Set<number>) => {
      if (!persistenceKey) return;
      try {
        localStorage.setItem(
          `${SCOPE_EXPANDED_STORAGE_KEY_PREFIX}-${persistenceKey}`,
          JSON.stringify({
            clientIds: Array.from(clients),
            iterationIds: Array.from(iterations),
          }),
        );
      } catch {
        // ignore quota etc.
      }
    },
    [persistenceKey],
  );

  const expandAll = useCallback(() => {
    const clients = new Set(allClientIds);
    const iterations = new Set(allIterationIds);
    setExpandedClients(clients);
    setExpandedIterations(iterations);
    persistExpandedState(clients, iterations);
  }, [allClientIds, allIterationIds, persistExpandedState]);

  const collapseAll = useCallback(() => {
    const empty = new Set<number>();
    setExpandedClients(empty);
    setExpandedIterations(empty);
    persistExpandedState(empty, empty);
  }, [persistExpandedState]);

  const footerTotals = useMemo(() => {
    if (!scopeHierarchyTotals) return null;
    const iterations = scopeHierarchyWithRates.flatMap((c) => c.iterations);
    const totalHours = iterations.reduce(
      (sum, row) =>
        sum +
        (scopeHierarchyTotals.byIteration.get(row.iteration.id)?.hours ?? 0),
      0,
    );
    const allCost = sumCurrencyValues(
      ...iterations.map(
        (row) =>
          scopeHierarchyTotals!.byIteration.get(row.iteration.id)?.cost ?? [],
      ),
    );
    const allBilling = sumCurrencyValues(
      ...iterations.map(
        (row) =>
          scopeHierarchyTotals!.byIteration.get(row.iteration.id)?.billing ??
          [],
      ),
    );
    const totalProfitInTarget =
      rateMap.size > 0
        ? sumCurrencyValuesInTarget(allBilling, rateMap, targetCurrency) -
          sumCurrencyValuesInTarget(allCost, rateMap, targetCurrency)
        : 0;
    const totalProfitAsValues: { amount: number; currency: string }[] =
      rateMap.size > 0
        ? [{ amount: totalProfitInTarget, currency: targetCurrency }]
        : sumCurrencyValues(
            ...iterations.map(
              (row) =>
                scopeHierarchyTotals!.byIteration.get(row.iteration.id)
                  ?.profit ?? [],
            ),
          );
    return {
      iterationCount: iterations.length,
      totalHours,
      totalCost: allCost,
      totalBilling: allBilling,
      totalProfit: totalProfitAsValues,
      avgCostRate: divideCurrencyValues(allCost, totalHours),
      avgBillingRate: divideCurrencyValues(allBilling, totalHours),
    };
  }, [scopeHierarchyTotals, scopeHierarchyWithRates, rateMap, targetCurrency]);

  return (
    <>
      <div className="mt-2 flex flex-col gap-2">
        <CardTitle>Financial overview</CardTitle>
        <CardDescription>
          Clients and iterations in the current selection. Expand rows to see
          contractors and rates; load a report to show cost and billing.
        </CardDescription>
      </div>
      {scopeHierarchyWithRates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No clients, iterations, or projects in scope.
        </p>
      ) : (
        <div
          className="scope-hierarchy-grid rounded border"
          style={{
            display: "grid",
            gridTemplateColumns:
              "auto 1fr minmax(3rem, auto) minmax(4rem, auto) minmax(4rem, auto) minmax(5rem, auto) minmax(5rem, auto) minmax(5rem, auto)",
            gap: "0 1rem",
            rowGap: 0,
            alignItems: "center",
          }}
        >
          {/* Header row */}
          <div className="contents text-xs font-medium text-muted-foreground border-b bg-muted/30">
            <span className="px-2 py-2 w-8" />
            <span className="py-2">Scope</span>
            <span className="py-2 text-right">Hours</span>
            <span className="py-2 text-right">Cost rate</span>
            <span className="py-2 text-right">Billing rate</span>
            <span className="py-2 text-right">Cost</span>
            <span className="py-2 text-right">Billing</span>
            <span className="py-2 text-right pr-2">Profit</span>
          </div>
          {scopeHierarchyWithRates.flatMap(({ clientId, iterations }) => {
            const clientOpen = expandedClients.has(clientId);
            return [
              <button
                key={`client-${clientId}`}
                type="button"
                onClick={() =>
                  setExpandedClients((prev) => {
                    const next = new Set(prev);
                    if (clientOpen) next.delete(clientId);
                    else next.add(clientId);
                    persistExpandedState(next, expandedIterations);
                    return next;
                  })
                }
                className="contents group text-left"
              >
                <span className="flex items-center px-2 py-2 w-8 shrink-0">
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${clientOpen ? "rotate-90" : ""}`}
                  />
                </span>
                <span className="flex min-w-0 items-center gap-2 py-2 hover:bg-muted/50 rounded-l">
                  <ClientWidget
                    clientId={maybe.of(clientId)}
                    services={services}
                    layout="full"
                    size="sm"
                  />
                  <span className="text-muted-foreground shrink-0">
                    {iterations.length} iteration(s)
                  </span>
                </span>
                {scopeHierarchyTotals ? (
                  (() => {
                    const client = scopeHierarchyTotals.byClient.get(clientId);
                    if (!client)
                      return <span style={{ gridColumn: "3 / 9" }} />;
                    const hours = client.hours;
                    const avgCost =
                      hours > 0 ? divideCurrencyValues(client.cost, hours) : [];
                    const avgBilling =
                      hours > 0
                        ? divideCurrencyValues(client.billing, hours)
                        : [];
                    return (
                      <>
                        <span
                          className="py-2 text-xs text-right tabular-nums"
                          style={{ gridColumn: "3 / 4" }}
                        >
                          {hours.toFixed(1)}
                        </span>
                        <span
                          className="py-2 text-xs text-right tabular-nums"
                          style={{ gridColumn: "4 / 5" }}
                        >
                          <CurrencyValueWidget
                            values={avgCost}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="font-medium"
                          />
                        </span>
                        <span
                          className="py-2 text-xs text-right tabular-nums"
                          style={{ gridColumn: "5 / 6" }}
                        >
                          <CurrencyValueWidget
                            values={avgBilling}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="font-medium"
                          />
                        </span>
                        <span
                          className="py-2 text-xs text-right tabular-nums"
                          style={{ gridColumn: "6 / 7" }}
                        >
                          <CurrencyValueWidget
                            values={client.cost}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="font-medium"
                          />
                        </span>
                        <span
                          className="py-2 text-xs text-right tabular-nums"
                          style={{ gridColumn: "7 / 8" }}
                        >
                          <CurrencyValueWidget
                            values={client.billing}
                            services={services}
                            exchangeService={services.exchangeService}
                            className="font-medium"
                          />
                        </span>
                        <span
                          className={`py-2 pr-2 text-xs text-right tabular-nums ${(() => {
                            const computed =
                              profitInTargetByClient.get(clientId);
                            const amount =
                              computed?.[0]?.amount ??
                              client.profit.reduce((s, v) => s + v.amount, 0);
                            return amount > 0
                              ? "font-medium text-green-600"
                              : "font-medium";
                          })()}`}
                          style={{ gridColumn: "8 / 9" }}
                        >
                          {profitInTargetByClient.get(clientId) ? (
                            <ProfitBreakdownWidget
                              services={services}
                              cost={client.cost}
                              billing={client.billing}
                              profitInTarget={
                                profitInTargetByClient.get(clientId)![0].amount
                              }
                              targetCurrency={targetCurrency}
                            />
                          ) : (
                            <CurrencyValueWidget
                              values={client.profit}
                              services={services}
                              exchangeService={services.exchangeService}
                              className="font-medium"
                            />
                          )}
                        </span>
                      </>
                    );
                  })()
                ) : (
                  <span style={{ gridColumn: "3 / 9" }} />
                )}
              </button>,
              clientOpen && (
                <div
                  key={`client-${clientId}-sub`}
                  className="col-span-full grid border-t border-border/50 bg-muted/20"
                  style={{
                    gridTemplateColumns: "subgrid",
                    gridColumn: "1 / -1",
                  }}
                >
                  {iterations.length === 0 ? (
                    <div
                      className="col-span-full px-4 py-2 pl-11 text-sm text-muted-foreground"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      No iterations
                    </div>
                  ) : (
                    iterations.flatMap(
                      ({
                        iteration,
                        iterationLabel,
                        projectName,
                        contractorsWithRates,
                      }) => {
                        const iterOpen = expandedIterations.has(iteration.id);
                        const hasRates =
                          contractorsWithRates &&
                          contractorsWithRates.length > 0;
                        return [
                          <button
                            key={`iter-${iteration.id}`}
                            type="button"
                            onClick={() =>
                              setExpandedIterations((prev) => {
                                const next = new Set(prev);
                                if (iterOpen) next.delete(iteration.id);
                                else next.add(iteration.id);
                                persistExpandedState(expandedClients, next);
                                return next;
                              })
                            }
                            className="contents group text-left"
                          >
                            <span className="flex items-center px-2 py-1.5 w-8 shrink-0 pl-4">
                              <ChevronRight
                                className={`h-3.5 w-3.5 shrink-0 transition-transform ${iterOpen ? "rotate-90" : ""}`}
                              />
                            </span>
                            <span className="flex min-w-0 items-center py-1.5 pl-2 text-sm font-medium hover:bg-muted/30 rounded">
                              {iterationLabel}
                            </span>
                            {scopeHierarchyTotals ? (
                              (() => {
                                const iter =
                                  scopeHierarchyTotals.byIteration.get(
                                    iteration.id,
                                  );
                                if (!iter)
                                  return (
                                    <span style={{ gridColumn: "3 / 9" }} />
                                  );
                                const hours = iter.hours;
                                const avgCost =
                                  hours > 0
                                    ? divideCurrencyValues(iter.cost, hours)
                                    : [];
                                const avgBilling =
                                  hours > 0
                                    ? divideCurrencyValues(iter.billing, hours)
                                    : [];
                                return (
                                  <>
                                    <span
                                      className="py-1.5 text-xs text-right tabular-nums"
                                      style={{ gridColumn: "3 / 4" }}
                                    >
                                      {hours.toFixed(1)}
                                    </span>
                                    <span
                                      className="py-1.5 text-xs text-right tabular-nums"
                                      style={{ gridColumn: "4 / 5" }}
                                    >
                                      <CurrencyValueWidget
                                        values={avgCost}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        className="font-medium"
                                      />
                                    </span>
                                    <span
                                      className="py-1.5 text-xs text-right tabular-nums"
                                      style={{ gridColumn: "5 / 6" }}
                                    >
                                      <CurrencyValueWidget
                                        values={avgBilling}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        className="font-medium"
                                      />
                                    </span>
                                    <span
                                      className="py-1.5 text-xs text-right tabular-nums"
                                      style={{ gridColumn: "6 / 7" }}
                                    >
                                      <CurrencyValueWidget
                                        values={iter.cost}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        className="font-medium"
                                      />
                                    </span>
                                    <span
                                      className="py-1.5 text-xs text-right tabular-nums"
                                      style={{ gridColumn: "7 / 8" }}
                                    >
                                      <CurrencyValueWidget
                                        values={iter.billing}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        className="font-medium"
                                      />
                                    </span>
                                    <span
                                      className={`py-1.5 pr-2 text-xs text-right tabular-nums ${(() => {
                                        const computed =
                                          profitInTargetByIteration.get(
                                            iteration.id,
                                          );
                                        const amount =
                                          computed?.[0]?.amount ??
                                          iter.profit.reduce(
                                            (s, v) => s + v.amount,
                                            0,
                                          );
                                        return amount > 0
                                          ? "font-medium text-green-600"
                                          : "font-medium";
                                      })()}`}
                                      style={{ gridColumn: "8 / 9" }}
                                    >
                                      {profitInTargetByIteration.get(
                                        iteration.id,
                                      ) ? (
                                        <ProfitBreakdownWidget
                                          services={services}
                                          cost={iter.cost}
                                          billing={iter.billing}
                                          profitInTarget={
                                            profitInTargetByIteration.get(
                                              iteration.id,
                                            )![0].amount
                                          }
                                          targetCurrency={targetCurrency}
                                        />
                                      ) : (
                                        <CurrencyValueWidget
                                          values={iter.profit}
                                          services={services}
                                          exchangeService={
                                            services.exchangeService
                                          }
                                          className="font-medium"
                                        />
                                      )}
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <span style={{ gridColumn: "3 / 9" }} />
                            )}
                          </button>,
                          iterOpen && (
                            <div
                              key={`iter-${iteration.id}-sub`}
                              className="col-span-full grid bg-background border-t border-border/30"
                              style={{
                                gridTemplateColumns: "subgrid",
                                gridColumn: "1 / -1",
                              }}
                            >
                              <span
                                className="col-start-2 col-end-3 py-1 pl-6 text-sm text-muted-foreground"
                                style={{ gridColumn: "2 / 3" }}
                              >
                                Project: {projectName}
                              </span>
                              {hasRates &&
                                cachedReport?.data &&
                                (() => {
                                  const contractorTotals =
                                    getContractorIterationTotals(
                                      cachedReport.data,
                                      iteration.id,
                                    );
                                  return (
                                    <>
                                      <div className="contents border-t border-border/30">
                                        <span
                                          className="w-8 shrink-0"
                                          style={{ gridColumn: "1 / 2" }}
                                        />
                                        <span
                                          className="py-1.5 pl-2 text-xs font-medium text-muted-foreground"
                                          style={{ gridColumn: "2 / 3" }}
                                        >
                                          Contractor
                                        </span>
                                        <span
                                          className="py-1.5 text-xs font-medium text-muted-foreground text-right"
                                          style={{ gridColumn: "3 / 4" }}
                                        >
                                          Hours
                                        </span>
                                        <span
                                          className="py-1.5 text-xs font-medium text-muted-foreground text-right"
                                          style={{ gridColumn: "4 / 5" }}
                                        >
                                          Cost rate
                                        </span>
                                        <span
                                          className="py-1.5 text-xs font-medium text-muted-foreground text-right"
                                          style={{ gridColumn: "5 / 6" }}
                                        >
                                          Billing rate
                                        </span>
                                        <span
                                          className="py-1.5 text-xs font-medium text-muted-foreground text-right"
                                          style={{ gridColumn: "6 / 7" }}
                                        >
                                          Cost
                                        </span>
                                        <span
                                          className="py-1.5 text-xs font-medium text-muted-foreground text-right"
                                          style={{ gridColumn: "7 / 8" }}
                                        >
                                          Billing
                                        </span>
                                        <span
                                          className="py-1.5 pr-2 text-xs font-medium text-muted-foreground text-right"
                                          style={{ gridColumn: "8 / 9" }}
                                        >
                                          Profit
                                        </span>
                                      </div>
                                      {contractorTotals.map((row) => (
                                        <div
                                          key={row.contractorId}
                                          className="contents text-xs"
                                        >
                                          <span
                                            className="w-8 shrink-0"
                                            style={{ gridColumn: "1 / 2" }}
                                          />
                                          <span
                                            className="min-w-0 py-1 pl-2"
                                            style={{ gridColumn: "2 / 3" }}
                                          >
                                            <ContractorWidget
                                              contractorId={maybe.of(
                                                row.contractorId,
                                              )}
                                              services={services}
                                              layout="full"
                                              size="sm"
                                              className="min-w-0"
                                            />
                                          </span>
                                          <span
                                            className="py-1 text-right tabular-nums"
                                            style={{ gridColumn: "3 / 4" }}
                                          >
                                            {row.hours.toFixed(1)}
                                          </span>
                                          <span
                                            className="py-1 text-right tabular-nums"
                                            style={{ gridColumn: "4 / 5" }}
                                          >
                                            {services.formatService.financial.amount(
                                              row.costRate,
                                              row.costCurrency,
                                            )}
                                          </span>
                                          <span
                                            className="py-1 text-right tabular-nums"
                                            style={{ gridColumn: "5 / 6" }}
                                          >
                                            {services.formatService.financial.amount(
                                              row.billingRate,
                                              row.billingCurrency,
                                            )}
                                          </span>
                                          <span
                                            className="py-1 text-right tabular-nums"
                                            style={{ gridColumn: "6 / 7" }}
                                          >
                                            {services.formatService.financial.amount(
                                              row.totalCost,
                                              row.costCurrency,
                                            )}
                                          </span>
                                          <span
                                            className="py-1 text-right tabular-nums"
                                            style={{ gridColumn: "7 / 8" }}
                                          >
                                            {services.formatService.financial.amount(
                                              row.totalBilling,
                                              row.billingCurrency,
                                            )}
                                          </span>
                                          <span
                                            className={`py-1 pr-2 text-right tabular-nums font-medium ${(() => {
                                              const profitEur =
                                                contractorProfitInTarget.get(
                                                  `${iteration.id}-${row.contractorId}`,
                                                );
                                              const value =
                                                profitEur ??
                                                row.totalBilling -
                                                  row.totalCost;
                                              return value > 0
                                                ? "text-green-600"
                                                : "";
                                            })()}`}
                                            style={{ gridColumn: "8 / 9" }}
                                          >
                                            <ProfitBreakdownWidget
                                              services={services}
                                              cost={[
                                                {
                                                  amount: row.totalCost,
                                                  currency: row.costCurrency,
                                                },
                                              ]}
                                              billing={[
                                                {
                                                  amount: row.totalBilling,
                                                  currency: row.billingCurrency,
                                                },
                                              ]}
                                              profitInTarget={
                                                contractorProfitInTarget.get(
                                                  `${iteration.id}-${row.contractorId}`,
                                                ) ??
                                                row.totalBilling - row.totalCost
                                              }
                                              targetCurrency={targetCurrency}
                                            />
                                          </span>
                                        </div>
                                      ))}
                                    </>
                                  );
                                })()}
                            </div>
                          ),
                        ];
                      },
                    )
                  )}
                </div>
              ),
            ];
          })}
          {/* Footer totals */}
          {footerTotals != null && footerTotals.iterationCount > 0 && (
            <div className="contents border-t bg-muted/30 text-xs font-medium">
              <span className="px-2 py-2 w-8" />
              <span className="py-2">
                Total: {footerTotals.iterationCount} iteration
                {footerTotals.iterationCount !== 1 ? "s" : ""}
              </span>
              <span className="py-2 text-right tabular-nums">
                {footerTotals.totalHours.toFixed(1)}
              </span>
              <span className="py-2 text-right tabular-nums">
                <CurrencyValueWidget
                  values={footerTotals.avgCostRate}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </span>
              <span className="py-2 text-right tabular-nums">
                <CurrencyValueWidget
                  values={footerTotals.avgBillingRate}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </span>
              <span className="py-2 text-right tabular-nums">
                <CurrencyValueWidget
                  values={footerTotals.totalCost}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </span>
              <span className="py-2 text-right tabular-nums">
                <CurrencyValueWidget
                  values={footerTotals.totalBilling}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </span>
              <span
                className={`py-2 pr-2 text-right tabular-nums font-medium ${
                  footerTotals.totalProfit.reduce((s, v) => s + v.amount, 0) > 0
                    ? "text-green-600"
                    : ""
                }`}
              >
                {footerTotals.totalProfit.length === 1 &&
                footerTotals.totalProfit[0].currency === targetCurrency ? (
                  <ProfitBreakdownWidget
                    services={services}
                    cost={footerTotals.totalCost}
                    billing={footerTotals.totalBilling}
                    profitInTarget={footerTotals.totalProfit[0].amount}
                    targetCurrency={targetCurrency}
                  />
                ) : (
                  <CurrencyValueWidget
                    values={footerTotals.totalProfit}
                    services={services}
                    exchangeService={services.exchangeService}
                    className="font-medium"
                  />
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
