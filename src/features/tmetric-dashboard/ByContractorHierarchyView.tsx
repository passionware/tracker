import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { WithFrontServices } from "@/core/frontServices";
import { maybe } from "@passionware/monads";
import { useCallback, useState, type ReactNode } from "react";
import {
  divideCurrencyValues,
  type ContractorIterationBreakdown,
} from "./tmetric-dashboard.utils";
import { FinancialHierarchyGrid } from "./FinancialHierarchyGrid";

export function ByContractorHierarchyView({
  contractors,
  services,
}: {
  contractors: ContractorIterationBreakdown[];
  services: WithFrontServices["services"];
}) {
  const [expandedContractors, setExpandedContractors] = useState<Set<number>>(
    () => new Set(),
  );

  const toggleContractor = useCallback((contractorId: number) => {
    setExpandedContractors((prev) => {
      const next = new Set(prev);
      if (next.has(contractorId)) next.delete(contractorId);
      else next.add(contractorId);
      return next;
    });
  }, []);

  if (contractors.length === 0) return null;

  return (
    <FinancialHierarchyGrid variant="withRates">
      <FinancialHierarchyGrid.Header />
      {contractors.flatMap((c) => {
        const open = expandedContractors.has(c.contractorId);
        const hasIterations = c.byIteration.length > 0;
        const totalHours = c.total.hours;
        const avgCostRate =
          totalHours > 0
            ? divideCurrencyValues(c.total.cost, totalHours)
            : [];
        const avgBillingRate =
          totalHours > 0
            ? divideCurrencyValues(c.total.billing, totalHours)
            : [];
        const totalProfitAmount = c.total.profit.reduce(
          (s, v) => s + v.amount,
          0,
        );
        const profitColorClass =
          totalProfitAmount > 0
            ? "text-green-600"
            : totalProfitAmount < 0
              ? "text-red-600"
              : "";
        const items: ReactNode[] = [
          <FinancialHierarchyGrid.ExpandableRow
            key={`row-${c.contractorId}`}
            open={open}
            onToggle={() => toggleContractor(c.contractorId)}
            label={
              <>
                <ContractorWidget
                  contractorId={maybe.of(c.contractorId)}
                  services={services}
                  layout="full"
                  size="sm"
                />
                {hasIterations && (
                  <span className="text-muted-foreground shrink-0">
                    {c.byIteration.length} iteration(s)
                  </span>
                )}
              </>
            }
            size="md"
          >
            <FinancialHierarchyGrid.Cell
              col={1}
              className="py-2 text-xs text-right tabular-nums"
            >
              {c.total.hours.toFixed(1)}
            </FinancialHierarchyGrid.Cell>
            <FinancialHierarchyGrid.Cell
              col={2}
              className="py-2 text-xs text-right tabular-nums"
            >
              <CurrencyValueWidget
                values={avgCostRate}
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
                values={avgBillingRate}
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
                values={c.total.cost}
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
                values={c.total.billing}
                services={services}
                exchangeService={services.exchangeService}
                className="font-medium"
              />
            </FinancialHierarchyGrid.Cell>
            <FinancialHierarchyGrid.Cell
              col={6}
              className="py-2 pr-2 text-xs text-right tabular-nums"
            >
              <CurrencyValueWidget
                values={c.total.profit}
                services={services}
                exchangeService={services.exchangeService}
                className={`font-medium ${profitColorClass}`}
              />
            </FinancialHierarchyGrid.Cell>
          </FinancialHierarchyGrid.ExpandableRow>,
        ];
        if (open && hasIterations) {
          items.push(
            <FinancialHierarchyGrid.Subgrid key={`sub-${c.contractorId}`}>
              {c.byIteration.map((iter) => {
                const iterHours = iter.hours;
                const iterAvgCostRate =
                  iterHours > 0
                    ? divideCurrencyValues(iter.cost, iterHours)
                    : [];
                const iterAvgBillingRate =
                  iterHours > 0
                    ? divideCurrencyValues(iter.billing, iterHours)
                    : [];
                const iterProfitAmount = iter.profit.reduce(
                  (s, v) => s + v.amount,
                  0,
                );
                const iterProfitColorClass =
                  iterProfitAmount > 0
                    ? "text-green-600"
                    : iterProfitAmount < 0
                      ? "text-red-600"
                      : "";
                return (
                  <FinancialHierarchyGrid.Row
                    key={iter.iterationId}
                    label={
                      <span className="text-sm font-medium">
                        {iter.iterationLabel}
                      </span>
                    }
                    size="sm"
                  >
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
                        values={iterAvgCostRate}
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
                        values={iterAvgBillingRate}
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
                      <CurrencyValueWidget
                        values={iter.profit}
                        services={services}
                        exchangeService={services.exchangeService}
                        className={`font-medium ${iterProfitColorClass}`}
                      />
                    </FinancialHierarchyGrid.Cell>
                  </FinancialHierarchyGrid.Row>
                );
              })}
            </FinancialHierarchyGrid.Subgrid>,
          );
        }
        return items;
      })}
    </FinancialHierarchyGrid>
  );
}
