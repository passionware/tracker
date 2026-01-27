import { Billing } from "@/api/billing/billing.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { prepareValues } from "@/services/front/ReportDisplayService/_private/prepareValues.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { groupBy, sumBy, uniq } from "lodash";

export function useBillingView(
  billings: RemoteData<Billing[]>,
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
  selectedIds?: number[],
) {
  const view = rd.useMemoMap(rd.combine({ billings, workspaces }), (data) => {
    const entries = data.billings.map((billing) =>
      calculateBilling(billing, data.workspaces),
    );

    const calculateTotals = (entriesToSum: typeof entries) => {
      const grouped = groupBy(entriesToSum, (cost) => cost.netAmount.currency);
      return {
        netAmount: prepareValues(
          Object.entries(grouped).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.netAmount.amount),
            currency,
          })),
        ),
        grossAmount: prepareValues(
          Object.entries(grouped).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.grossAmount.amount),
            currency,
          })),
        ),
        matchedAmount: prepareValues(
          Object.entries(grouped).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.matchedAmount.amount),
            currency,
          })),
        ),
        remainingAmount: prepareValues(
          Object.entries(grouped).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.remainingAmount.amount),
            currency,
          })),
        ),
      };
    };

    const total = calculateTotals(entries);
    const totalSelected =
      selectedIds && selectedIds.length > 0
        ? calculateTotals(
            entries.filter((entry) => selectedIds.includes(entry.id)),
          )
        : undefined;

    return {
      entries,
      total,
      totalSelected,
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

    const updateApproximatedValue = (total: typeof data.view.total) => {
      Object.values(total).forEach((totalValue) => {
        totalValue.approximatedJointValue.amount = sumBy(
          totalValue.values,
          (value) => {
            const rate = getCurrencyRate(value.currency);
            return value.amount * rate.rate;
          },
        );
      });
    };

    updateApproximatedValue(data.view.total);
    if (data.view.totalSelected) {
      updateApproximatedValue(data.view.totalSelected);
    }

    return data.view;
  });
}

export function calculateBilling(
  billing: Billing,
  workspaces: Workspace[],
): BillingViewEntry {
  const sumOfLinkedAmounts = billing.totalBillingValue;
  const remainingAmount = billing.remainingBalance;

  function getStatus() {
    if (remainingAmount === 0) {
      const hasAtLeastOneClarification = billing.linkBillingReport?.some(
        (link) => link.link.linkType === "clarify",
      );
      if (hasAtLeastOneClarification) {
        return "clarified";
      }
      return "matched";
    } else if (remainingAmount > 0 && sumOfLinkedAmounts > 0) {
      return "partially-matched";
    } else {
      if (remainingAmount < 0) {
        return "overmatched";
      }
      return "unmatched";
    }
  }

  const status = getStatus();

  return {
    originalBilling: billing,
    id: billing.id,
    client: billing.client,
    netAmount: {
      amount: billing.totalNet,
      currency: billing.currency,
    },
    grossAmount: {
      amount: billing.totalGross,
      currency: billing.currency,
    },
    invoiceNumber: billing.invoiceNumber,
    invoiceDate: billing.invoiceDate,
    description: billing.description,
    links: billing.linkBillingReport,
    matchedAmount: {
      amount: sumOfLinkedAmounts,
      currency: billing.currency,
    },
    remainingAmount: {
      amount: remainingAmount,
      currency: billing.currency,
    },
    status: status,
    workspace: maybe.getOrThrow(
      workspaces.find((workspace) => workspace.id === billing.workspaceId),
      "Workspace is missing",
    ),
    contractors: billing.contractors,
  };
}
