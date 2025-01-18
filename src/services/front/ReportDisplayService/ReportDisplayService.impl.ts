import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import {
  Workspace,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import {
  ClientBillingViewEntry,
  ContractorReportViewEntry,
  CostEntry,
  ReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientBillingService } from "@/services/io/ClientBillingService/ClientBillingService.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { addDays, isSameDay } from "date-fns";
import { groupBy, sumBy, uniq } from "lodash";

const prepareValues = <T>(data: T) => ({
  values: data,
  approximatedJointValue: { currency: "PLN", amount: 0 },
});

export function createReportDisplayService(
  config: WithServices<
    [
      WithContractorReportService,
      WithClientBillingService,
      WithWorkspaceService,
      WithCostService,
      WithExchangeService,
    ]
  >,
): ReportDisplayService {
  return {
    useReportView: (query) => {
      const reports =
        config.services.contractorReportService.useContractorReports(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );

      const view = rd.useMemoMap(
        rd.combine({ reports, workspaces }),
        (data) => {
          const entries = data.reports.map((report) =>
            calculateReportEntry(report, data.workspaces),
          );
          const groupedEntries = groupBy(
            entries,
            (cost) => cost.netAmount.currency,
          );
          return {
            entries,
            total: {
              netAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(reports, (report) => report.netAmount.amount),
                  currency,
                })),
              ),
              reconciledAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.reconciledAmount.amount,
                  ),
                  currency,
                })),
              ),
              chargedAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.billedAmount.amount,
                  ),
                  currency,
                })),
              ),
              toChargeAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.remainingAmount.amount,
                  ),
                  currency,
                })),
              ),
              compensatedAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.compensatedAmount.amount,
                  ),
                  currency,
                })),
              ),
              toCompensateAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.remainingCompensationAmount.amount,
                  ),
                  currency,
                })),
              ),
              toFullyCompensateAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.remainingFullCompensationAmount.amount,
                  ),
                  currency,
                })),
              ),
            },
          };
        },
      );
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
    },
    useBillingView: (query) => {
      const billings =
        config.services.clientBillingService.useClientBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      const view = rd.useMemoMap(
        rd.combine({ billings, workspaces }),
        (data) => {
          const entries = data.billings.map((billing) =>
            calculateBilling(billing, data.workspaces),
          );
          const groupedEntries = groupBy(
            entries,
            (cost) => cost.netAmount.currency,
          );
          return {
            entries,
            total: {
              netAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(reports, (report) => report.netAmount.amount),
                  currency,
                })),
              ),
              grossAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(reports, (report) => report.grossAmount.amount),
                  currency,
                })),
              ),
              matchedAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.matchedAmount.amount,
                  ),
                  currency,
                })),
              ),
              remainingAmount: prepareValues(
                Object.entries(groupedEntries).map(([currency, reports]) => ({
                  amount: sumBy(
                    reports,
                    (report) => report.remainingAmount.amount,
                  ),
                  currency,
                })),
              ),
            },
          };
        },
      );

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
    },
    useCostView: (query) => {
      const costs = config.services.costService.useCosts(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      const view = rd.useMemoMap(rd.combine({ costs, workspaces }), (data) => {
        const entries = data.costs.map((cost) =>
          calculateCost(cost, data.workspaces),
        );
        const groupedEntries = groupBy(
          entries,
          (cost) => cost.netAmount.currency,
        );
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
    },
  };
}
function calculateReportEntry(
  report: ContractorReport,
  workspaces: Workspace[],
): ContractorReportViewEntry {
  // const haveSameClient = report.linkBillingReport?.every(
  //   (link) =>
  //     link.linkType === "clarify" || link.billing?.clientId === report.clientId,
  // );
  // if (!haveSameClient) {
  //   debugger;
  //   throw new Error(
  //     "Invalid report. All linked billing reports must have the same client.",
  //   );
  // }

  function getBillingStatus() {
    if (report.reportBillingBalance === 0) {
      if (
        report.linkBillingReport?.some(
          (link) => link.link.linkType === "clarify",
        )
      ) {
        return "clarified";
      } else {
        return "billed";
      }
    } else if (
      report.reportBillingBalance > 0 &&
      report.reportBillingValue > 0
    ) {
      return "partially-billed";
    } else {
      return "uncovered";
    }
  }
  ////

  function getInstantEarningsStatus() {
    // compensation amount: reportCostValue
    // to pay: billingCostBalance
    if (report.reportBillingValue === report.immediatePaymentDue) {
      if (report.netValue === 0) {
        return "compensated";
      }
      // reported costs
      return "uncompensated";
    }
    if (report.immediatePaymentDue > 0) {
      return "partially-compensated";
    }
    return "compensated";
  }

  function getDeferredEarningStatus() {
    if (report.reportCostBalance <= 0) {
      return "compensated";
    }

    if (
      report.reportCostBalance >=
      report.netValue - report.reportBillingValue
    ) {
      return "uncompensated";
    }
    return "partially-compensated";
  }

  return {
    id: report.id,
    client: report.client,
    contractor: maybe.getOrThrow(report.contractor, "Contractor is missing"),
    netAmount: {
      amount: report.netValue,
      currency: report.currency,
    },
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    description: report.description,
    // statuses
    status: getBillingStatus(),
    instantEarnings: getInstantEarningsStatus(),
    deferredEarnings: getDeferredEarningStatus(),
    //
    reconciledAmount: {
      amount: report.reportBillingValue,
      currency: report.currency,
    },
    billedAmount: {
      // todo probably reconciled and billed will be the same
      amount: report.reportBillingValue,
      currency: report.currency,
    },
    remainingAmount: {
      amount: report.reportBillingBalance,
      currency: report.currency,
    },
    compensatedAmount: {
      amount: report.reportCostValue,
      currency: report.currency,
    },
    remainingCompensationAmount: {
      amount: Math.max(0, report.immediatePaymentDue),
      currency: report.currency,
    },
    remainingFullCompensationAmount: {
      amount: report.reportCostBalance,
      currency: report.currency,
    },
    costLinks: report.linkCostReport,
    billingLinks: report.linkBillingReport,
    workspace: maybe.getOrThrow(
      workspaces.find((workspace) => workspace.id === report.workspaceId),
      "Workspace is missing",
    ),
    previousReportInfo: maybe.mapOrNull(
      report.previousReport,
      (previousReport) => ({
        isAdjacent: isSameDay(
          addDays(previousReport.periodEnd, 1),
          report.periodStart,
        ),
      }),
    ),
  };
}

function calculateBilling(
  billing: ClientBilling,
  workspaces: Workspace[],
): ClientBillingViewEntry {
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
      return "unmatched";
    }
  }

  const status = getStatus();

  return {
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
