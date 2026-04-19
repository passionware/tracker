import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { WithFrontServices } from "@/core/frontServices";
import { maybe } from "@passionware/monads";
import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  divideCurrencyValues,
  type ContractorIterationBreakdown,
} from "./tmetric-dashboard.utils";
import { FinancialHierarchyGrid } from "./FinancialHierarchyGrid";

export function ByContractorHierarchyView({
  contractors,
  services,
  getContractorDetailUrl,
}: {
  contractors: ContractorIterationBreakdown[];
  services: WithFrontServices["services"];
  /** When set, contractor name becomes a link to this URL (e.g. contractor detail page). */
  getContractorDetailUrl?: (contractorId: number) => string;
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
          totalHours > 0 ? divideCurrencyValues(c.total.cost, totalHours) : [];
        const avgBillingRate =
          totalHours > 0
            ? divideCurrencyValues(c.total.billing, totalHours)
            : [];
        const items: ReactNode[] = [
          <FinancialHierarchyGrid.ExpandableRow
            key={`row-${c.contractorId}`}
            open={open}
            onToggle={() => toggleContractor(c.contractorId)}
            label={
              <span className="flex w-full min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                {getContractorDetailUrl ? (
                  <Link
                    to={getContractorDetailUrl(c.contractorId)}
                    className="min-w-0 hover:underline focus:outline-none focus:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ContractorWidget
                      contractorId={maybe.of(c.contractorId)}
                      services={services}
                      layout="full"
                      size="sm"
                    />
                  </Link>
                ) : (
                  <ContractorWidget
                    contractorId={maybe.of(c.contractorId)}
                    services={services}
                    layout="full"
                    size="sm"
                  />
                )}
                {hasIterations && (
                  <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                    {c.byIteration.length} iteration(s)
                  </span>
                )}
              </span>
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
              className="py-2 text-xs text-right tabular-nums"
            >
              <CurrencyValueWidget
                values={c.total.profit}
                services={services}
                exchangeService={services.exchangeService}
                colorize
                className="font-medium"
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
                        colorize
                        className="font-medium"
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
