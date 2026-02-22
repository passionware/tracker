import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import type { Project } from "@/api/project/project.api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithFrontServices } from "@/core/frontServices";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import type { GenericReport } from "@/services/io/_common/GenericReport";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { maybe, rd, type RemoteData } from "@passionware/monads";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinancialHierarchyGrid } from "./FinancialHierarchyGrid";
import { ProfitBreakdownWidget } from "./ProfitBreakdownWidget";
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Financial overview</CardTitle>
            <CardDescription>
              Clients and iterations in the current selection. Expand rows to
              see contractors and rates; load a report to show cost and billing.
            </CardDescription>
          </div>
          {scopeHierarchyWithRates.length > 0 && (
            <div className="flex gap-1 shrink-0">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand all
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse all
              </Button>
            </div>
          )}
        </div>
      </div>
      {scopeHierarchyWithRates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No clients, iterations, or projects in scope.
        </p>
      ) : (
        <FinancialHierarchyGrid variant="withRates">
          <FinancialHierarchyGrid.Header />
          {scopeHierarchyWithRates.flatMap(({ clientId, iterations }) => {
            const clientOpen = expandedClients.has(clientId);
            const client = scopeHierarchyTotals?.byClient.get(clientId);
            return [
              <FinancialHierarchyGrid.ExpandableRow
                key={`client-${clientId}`}
                open={clientOpen}
                onToggle={() =>
                  setExpandedClients((prev) => {
                    const next = new Set(prev);
                    if (clientOpen) next.delete(clientId);
                    else next.add(clientId);
                    persistExpandedState(next, expandedIterations);
                    return next;
                  })
                }
                label={
                  <>
                    <ClientWidget
                      clientId={maybe.of(clientId)}
                      services={services}
                      layout="full"
                      size="sm"
                    />
                    <span className="text-muted-foreground shrink-0">
                      {iterations.length} iteration(s)
                    </span>
                  </>
                }
                size="md"
              >
                {client ? (
                  <>
                    <FinancialHierarchyGrid.Cell
                      col={1}
                      className="py-2 text-xs text-right tabular-nums"
                    >
                      {client.hours.toFixed(1)}
                    </FinancialHierarchyGrid.Cell>
                    <FinancialHierarchyGrid.Cell
                      col={2}
                      className="py-2 text-xs text-right tabular-nums"
                    >
                      <CurrencyValueWidget
                        values={
                          client.hours > 0
                            ? divideCurrencyValues(client.cost, client.hours)
                            : []
                        }
                        services={services}
                        exchangeService={services.exchangeService}
                        className="font-medium"
                      />
                    </FinancialHierarchyGrid.Cell>
                    <FinancialHierarchyGrid.Cell
                      col={3}
                      className="py-2 text-xs text-right tabular-nums"
                    >
                      <CurrencyValueWidget
                        values={
                          client.hours > 0
                            ? divideCurrencyValues(client.billing, client.hours)
                            : []
                        }
                        services={services}
                        exchangeService={services.exchangeService}
                        className="font-medium"
                      />
                    </FinancialHierarchyGrid.Cell>
                    <FinancialHierarchyGrid.Cell
                      col={4}
                      className="py-2 text-xs text-right tabular-nums"
                    >
                      <CurrencyValueWidget
                        values={client.cost}
                        services={services}
                        exchangeService={services.exchangeService}
                        className="font-medium"
                      />
                    </FinancialHierarchyGrid.Cell>
                    <FinancialHierarchyGrid.Cell
                      col={5}
                      className="py-2 text-xs text-right tabular-nums"
                    >
                      <CurrencyValueWidget
                        values={client.billing}
                        services={services}
                        exchangeService={services.exchangeService}
                        className="font-medium"
                      />
                    </FinancialHierarchyGrid.Cell>
                    <FinancialHierarchyGrid.Cell
                      col={6}
                      className="py-2 text-xs text-right tabular-nums"
                    >
                      {(() => {
                        return profitInTargetByClient.get(clientId) ? (
                          <ProfitBreakdownWidget
                            services={services}
                            cost={client.cost}
                            billing={client.billing}
                            profitInTarget={
                              profitInTargetByClient.get(clientId)![0].amount
                            }
                            targetCurrency={targetCurrency}
                            colorize
                            className="font-medium"
                          />
                        ) : (
                          <CurrencyValueWidget
                            values={client.profit}
                            services={services}
                            exchangeService={services.exchangeService}
                            colorize
                            className="font-medium"
                          />
                        );
                      })()}
                    </FinancialHierarchyGrid.Cell>
                  </>
                ) : (
                  <span style={{ gridColumn: "3 / 9" }} />
                )}
              </FinancialHierarchyGrid.ExpandableRow>,
              clientOpen && (
                <FinancialHierarchyGrid.Subgrid key={`client-${clientId}-sub`}>
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
                        const iter = scopeHierarchyTotals?.byIteration.get(
                          iteration.id,
                        );
                        return [
                          <FinancialHierarchyGrid.ExpandableRow
                            key={`iter-${iteration.id}`}
                            open={iterOpen}
                            onToggle={() =>
                              setExpandedIterations((prev) => {
                                const next = new Set(prev);
                                if (iterOpen) next.delete(iteration.id);
                                else next.add(iteration.id);
                                persistExpandedState(expandedClients, next);
                                return next;
                              })
                            }
                            label={
                              <span className="text-sm font-medium">
                                {iterationLabel}
                              </span>
                            }
                            size="sm"
                          >
                            {iter ? (
                              <>
                                <FinancialHierarchyGrid.Cell
                                  col={1}
                                  className="py-1.5 text-xs text-right tabular-nums"
                                >
                                  {iter.hours.toFixed(1)}
                                </FinancialHierarchyGrid.Cell>
                                <FinancialHierarchyGrid.Cell
                                  col={2}
                                  className="py-1.5 text-xs text-right tabular-nums"
                                >
                                  <CurrencyValueWidget
                                    values={
                                      iter.hours > 0
                                        ? divideCurrencyValues(
                                            iter.cost,
                                            iter.hours,
                                          )
                                        : []
                                    }
                                    services={services}
                                    exchangeService={services.exchangeService}
                                    className="font-medium"
                                  />
                                </FinancialHierarchyGrid.Cell>
                                <FinancialHierarchyGrid.Cell
                                  col={3}
                                  className="py-1.5 text-xs text-right tabular-nums"
                                >
                                  <CurrencyValueWidget
                                    values={
                                      iter.hours > 0
                                        ? divideCurrencyValues(
                                            iter.billing,
                                            iter.hours,
                                          )
                                        : []
                                    }
                                    services={services}
                                    exchangeService={services.exchangeService}
                                    className="font-medium"
                                  />
                                </FinancialHierarchyGrid.Cell>
                                <FinancialHierarchyGrid.Cell
                                  col={4}
                                  className="py-1.5 text-xs text-right tabular-nums"
                                >
                                  <CurrencyValueWidget
                                    values={iter.cost}
                                    services={services}
                                    exchangeService={services.exchangeService}
                                    className="font-medium"
                                  />
                                </FinancialHierarchyGrid.Cell>
                                <FinancialHierarchyGrid.Cell
                                  col={5}
                                  className="py-1.5 text-xs text-right tabular-nums"
                                >
                                  <CurrencyValueWidget
                                    values={iter.billing}
                                    services={services}
                                    exchangeService={services.exchangeService}
                                    className="font-medium"
                                  />
                                </FinancialHierarchyGrid.Cell>
                                <FinancialHierarchyGrid.Cell
                                  col={6}
                                  className="py-1.5 pr-2 text-xs text-right tabular-nums"
                                >
                                  {(() => {
                                    return profitInTargetByIteration.get(
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
                                        colorize
                                        className="font-medium"
                                      />
                                    ) : (
                                      <CurrencyValueWidget
                                        values={iter.profit}
                                        services={services}
                                        exchangeService={
                                          services.exchangeService
                                        }
                                        colorize
                                        className="font-medium"
                                      />
                                    );
                                  })()}
                                </FinancialHierarchyGrid.Cell>
                              </>
                            ) : (
                              <span style={{ gridColumn: "3 / 9" }} />
                            )}
                          </FinancialHierarchyGrid.ExpandableRow>,
                          iterOpen && (
                            <FinancialHierarchyGrid.Subgrid
                              key={`iter-${iteration.id}-sub`}
                              variant="nested"
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
                                      {contractorTotals.map((row) => {
                                        const profitEur =
                                          contractorProfitInTarget.get(
                                            `${iteration.id}-${row.contractorId}`,
                                          );
                                        const profitValue =
                                          profitEur ??
                                          row.totalBilling - row.totalCost;
                                        return (
                                          <FinancialHierarchyGrid.Row
                                            key={row.contractorId}
                                            label={
                                              <ContractorWidget
                                                contractorId={maybe.of(
                                                  row.contractorId,
                                                )}
                                                services={services}
                                                layout="full"
                                                size="sm"
                                                className="min-w-0"
                                              />
                                            }
                                            size="sm"
                                          >
                                            <FinancialHierarchyGrid.Cell
                                              col={1}
                                              className="py-1 text-xs text-right tabular-nums"
                                            >
                                              {row.hours.toFixed(1)}
                                            </FinancialHierarchyGrid.Cell>
                                            <FinancialHierarchyGrid.Cell
                                              col={2}
                                              className="py-1 text-xs text-right tabular-nums"
                                            >
                                              {services.formatService.financial.amount(
                                                row.costRate,
                                                row.costCurrency,
                                              )}
                                            </FinancialHierarchyGrid.Cell>
                                            <FinancialHierarchyGrid.Cell
                                              col={3}
                                              className="py-1 text-xs text-right tabular-nums"
                                            >
                                              {services.formatService.financial.amount(
                                                row.billingRate,
                                                row.billingCurrency,
                                              )}
                                            </FinancialHierarchyGrid.Cell>
                                            <FinancialHierarchyGrid.Cell
                                              col={4}
                                              className="py-1 text-xs text-right tabular-nums"
                                            >
                                              {services.formatService.financial.amount(
                                                row.totalCost,
                                                row.costCurrency,
                                              )}
                                            </FinancialHierarchyGrid.Cell>
                                            <FinancialHierarchyGrid.Cell
                                              col={5}
                                              className="py-1 text-xs text-right tabular-nums"
                                            >
                                              {services.formatService.financial.amount(
                                                row.totalBilling,
                                                row.billingCurrency,
                                              )}
                                            </FinancialHierarchyGrid.Cell>
                                            <FinancialHierarchyGrid.Cell
                                              col={6}
                                              className="py-1 pr-2 text-xs text-right tabular-nums"
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
                                                    currency:
                                                      row.billingCurrency,
                                                  },
                                                ]}
                                                profitInTarget={profitValue}
                                                targetCurrency={targetCurrency}
                                                colorize
                                                className="font-medium"
                                              />
                                            </FinancialHierarchyGrid.Cell>
                                          </FinancialHierarchyGrid.Row>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                            </FinancialHierarchyGrid.Subgrid>
                          ),
                        ];
                      },
                    )
                  )}
                </FinancialHierarchyGrid.Subgrid>
              ),
            ];
          })}
          {footerTotals != null && footerTotals.iterationCount > 0 && (
            <FinancialHierarchyGrid.Footer
              label={
                <>
                  Total: {footerTotals.iterationCount} iteration
                  {footerTotals.iterationCount !== 1 ? "s" : ""}
                </>
              }
            >
              <FinancialHierarchyGrid.Cell
                col={1}
                className="py-2 text-right tabular-nums"
              >
                {footerTotals.totalHours.toFixed(1)}
              </FinancialHierarchyGrid.Cell>
              <FinancialHierarchyGrid.Cell
                col={2}
                className="py-2 text-right tabular-nums"
              >
                <CurrencyValueWidget
                  values={footerTotals.avgCostRate}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </FinancialHierarchyGrid.Cell>
              <FinancialHierarchyGrid.Cell
                col={3}
                className="py-2 text-right tabular-nums"
              >
                <CurrencyValueWidget
                  values={footerTotals.avgBillingRate}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </FinancialHierarchyGrid.Cell>
              <FinancialHierarchyGrid.Cell
                col={4}
                className="py-2 text-right tabular-nums"
              >
                <CurrencyValueWidget
                  values={footerTotals.totalCost}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </FinancialHierarchyGrid.Cell>
              <FinancialHierarchyGrid.Cell
                col={5}
                className="py-2 text-right tabular-nums"
              >
                <CurrencyValueWidget
                  values={footerTotals.totalBilling}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </FinancialHierarchyGrid.Cell>
              <FinancialHierarchyGrid.Cell
                col={6}
                className="py-2 pr-2 text-right tabular-nums"
              >
                {(() => {
                  return footerTotals.totalProfit.length === 1 &&
                    footerTotals.totalProfit[0].currency === targetCurrency ? (
                    <ProfitBreakdownWidget
                      services={services}
                      cost={footerTotals.totalCost}
                      billing={footerTotals.totalBilling}
                      profitInTarget={footerTotals.totalProfit[0].amount}
                      targetCurrency={targetCurrency}
                      colorize
                      className="font-medium"
                    />
                  ) : (
                    <CurrencyValueWidget
                      values={footerTotals.totalProfit}
                      services={services}
                      exchangeService={services.exchangeService}
                      colorize
                      className="font-medium"
                    />
                  );
                })()}
              </FinancialHierarchyGrid.Cell>
            </FinancialHierarchyGrid.Footer>
          )}
        </FinancialHierarchyGrid>
      )}

      {scopeHierarchyTotals != null && scopeHierarchyWithRates.length > 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">By client</h3>
            <p className="text-sm text-muted-foreground">
              Billing breakdown per client: iterations and totals (hours,
              billing rate, billing).
            </p>
          </div>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 620px), 1fr))",
            }}
          >
            {scopeHierarchyWithRates.map(({ clientId, iterations }) => {
              const clientTotals = scopeHierarchyTotals!.byClient.get(clientId);
              return (
                <Card key={`by-client-${clientId}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <ClientWidget
                        clientId={maybe.of(clientId)}
                        services={services}
                        layout="full"
                        size="sm"
                      />
                    </CardTitle>
                    <CardDescription>
                      {iterations.length} iteration
                      {iterations.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FinancialHierarchyGrid variant="billingOnly">
                      <FinancialHierarchyGrid.Header />
                      {iterations.map(({ iteration, projectName }) => {
                        const iter = scopeHierarchyTotals!.byIteration.get(
                          iteration.id,
                        );
                        if (!iter) return null;
                        const startDate = calendarDateToJSDate(
                          iteration.periodStart,
                        );
                        const endDate = calendarDateToJSDate(
                          iteration.periodEnd,
                        );
                        return (
                          <FinancialHierarchyGrid.Row
                            key={`by-client-${clientId}-iter-${iteration.id}`}
                            label={
                              <span className="text-sm font-medium whitespace-nowrap">
                                {projectName} #{iteration.ordinalNumber}
                              </span>
                            }
                          >
                            <FinancialHierarchyGrid.Cell
                              col={1}
                              className="py-1.5 text-xs text-left text-muted-foreground tabular-nums"
                            >
                              {services.formatService.temporal.range.compact(
                                startDate,
                                endDate,
                              )}
                            </FinancialHierarchyGrid.Cell>
                            <FinancialHierarchyGrid.Cell
                              col={2}
                              className="py-1.5 text-xs text-right tabular-nums"
                            >
                              {iter.hours.toFixed(1)}
                            </FinancialHierarchyGrid.Cell>
                            <FinancialHierarchyGrid.Cell
                              col={3}
                              className="py-1.5 text-xs text-right tabular-nums"
                            >
                              <CurrencyValueWidget
                                values={
                                  iter.hours > 0
                                    ? divideCurrencyValues(
                                        iter.billing,
                                        iter.hours,
                                      )
                                    : []
                                }
                                services={services}
                                exchangeService={services.exchangeService}
                              />
                            </FinancialHierarchyGrid.Cell>
                            <FinancialHierarchyGrid.Cell
                              col={4}
                              className="py-1.5 pr-2 text-xs text-right tabular-nums"
                            >
                              <CurrencyValueWidget
                                values={iter.billing}
                                services={services}
                                exchangeService={services.exchangeService}
                              />
                            </FinancialHierarchyGrid.Cell>
                          </FinancialHierarchyGrid.Row>
                        );
                      })}
                      {clientTotals != null && (
                        <FinancialHierarchyGrid.Footer label="Total">
                          <FinancialHierarchyGrid.Cell
                            col={1}
                            className="py-2 text-muted-foreground"
                          >
                            {null}
                          </FinancialHierarchyGrid.Cell>
                          <FinancialHierarchyGrid.Cell
                            col={2}
                            className="py-2 text-right tabular-nums"
                          >
                            {clientTotals.hours.toFixed(1)}
                          </FinancialHierarchyGrid.Cell>
                          <FinancialHierarchyGrid.Cell
                            col={3}
                            className="py-2 text-right tabular-nums"
                          >
                            <CurrencyValueWidget
                              values={
                                clientTotals.hours > 0
                                  ? divideCurrencyValues(
                                      clientTotals.billing,
                                      clientTotals.hours,
                                    )
                                  : []
                              }
                              services={services}
                              exchangeService={services.exchangeService}
                            />
                          </FinancialHierarchyGrid.Cell>
                          <FinancialHierarchyGrid.Cell
                            col={4}
                            className="py-2 pr-2 text-right tabular-nums"
                          >
                            <CurrencyValueWidget
                              values={clientTotals.billing}
                              services={services}
                              exchangeService={services.exchangeService}
                            />
                          </FinancialHierarchyGrid.Cell>
                        </FinancialHierarchyGrid.Footer>
                      )}
                    </FinancialHierarchyGrid>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
