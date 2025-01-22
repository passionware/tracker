import { Cost } from "@/api/cost/cost.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { prepareValues } from "@/services/front/ReportDisplayService/_private/prepareValues.ts";
import { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { groupBy, sumBy, uniq } from "lodash";

export function generateCostView(
  costs: RemoteData<Cost[]>,
  workspaces: RemoteData<Workspace[]>,
  config: WithServices<
    [
      WithReportService,
      WithBillingService,
      WithWorkspaceService,
      WithCostService,
      WithExchangeService,
    ]
  >,
) {
  const view = rd.useMemoMap(rd.combine({ costs, workspaces }), (data) => {
    const entries = data.costs.map((cost) =>
      calculateCost(cost, data.workspaces),
    );
    const groupedEntries = groupBy(entries, (cost) => cost.netAmount.currency);
    const total = {
      netAmount: prepareValues(
        Object.entries(groupedEntries).map(([currency, costs]) => ({
          amount: sumBy(costs, (cost) => cost.netAmount.amount),
          currency,
        })),
      ),
      matchedAmount: prepareValues(
        Object.entries(groupedEntries).map(([currency, costs]) => ({
          amount: sumBy(costs, (cost) => cost.matchedAmount.amount),
          currency,
        })),
      ),
      remainingAmount: prepareValues(
        Object.entries(groupedEntries).map(([currency, costs]) => ({
          amount: sumBy(costs, (cost) => cost.remainingAmount.amount),
          currency,
        })),
      ),
    };

    return {
      entries,
      total,
    };
  });
  const currencies = rd.useMemoMap(view, (data) =>
    uniq(data.total.netAmount.values.map((value) => value.currency)),
  );

  const exchangeRates = config.services.exchangeService.useExchangeRates(
    rd.mapOrElse(
      currencies,
      (currencies) =>
        currencies.map((currency) => ({ from: currency, to: "PLN" })),
      [],
    ),
  );

  return rd.useMemoMap(rd.combine({ view, exchangeRates }), (data) => {
    const getCurrencyRate = (currency: string) =>
      maybe.getOrThrow(
        data.exchangeRates.find(
          (rate) => rate.from === currency && rate.to === "PLN",
        ),
      );

    Object.values(data.view.total).forEach((total) => {
      total.approximatedJointValue.amount = sumBy(total.values, (value) => {
        const rate = getCurrencyRate(value.currency);
        return value.amount * rate.rate;
      });
    });

    return data.view;
  });
}

function calculateCost(cost: Cost, workspaces: Workspace[]): CostEntry {
  const sumOfLinkedAmounts = sumBy(
    cost.linkReports,
    (link) => link.link.costAmount,
  );
  const remainingAmount = cost.netValue - sumOfLinkedAmounts;

  function getStatus() {
    if (remainingAmount === 0) {
      return "matched";
    } else if (remainingAmount > 0 && sumOfLinkedAmounts > 0) {
      return "partially-matched";
    } else {
      if (sumOfLinkedAmounts > cost.netValue) {
        return "overmatched";
      }
      return "unmatched";
    }
  }

  const status = getStatus();

  return {
    originalCost: cost,
    id: cost.id,
    invoiceNumber: cost.invoiceNumber,
    invoiceDate: cost.invoiceDate,
    contractor: cost.contractor,
    counterparty: cost.counterparty,
    createdAt: cost.createdAt,
    netAmount: {
      amount: cost.netValue,
      currency: cost.currency,
    },
    grossAmount: maybe.map(cost.grossValue, (grossValue) => ({
      amount: grossValue,
      currency: cost.currency,
    })),
    description: cost.description,
    linkReports: cost.linkReports,
    matchedAmount: {
      amount: sumOfLinkedAmounts,
      currency: cost.currency,
    },
    remainingAmount: {
      amount: remainingAmount,
      currency: cost.currency,
    },
    status: status,
    workspace: maybe.getOrThrow(
      workspaces.find((workspace) => workspace.id === cost.workspaceId),
      "Workspace is missing",
    ),
  };
}
