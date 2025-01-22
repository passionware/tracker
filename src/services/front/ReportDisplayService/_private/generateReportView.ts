import { Report } from "@/api/reports/reports.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { prepareValues } from "@/services/front/ReportDisplayService/_private/prepareValues.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { addDays, isSameDay } from "date-fns";
import { groupBy, sumBy, uniq } from "lodash";

export function generateReportView(
  reports: RemoteData<Report[]>,
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
  const view = rd.useMemoMap(rd.combine({ reports, workspaces }), (data) => {
    const entries = data.reports.map((report) =>
      calculateReportEntry(report, data.workspaces),
    );
    const groupedEntries = groupBy(entries, (cost) => cost.netAmount.currency);
    return {
      entries,
      total: {
        netAmount: prepareValues(
          Object.entries(groupedEntries).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.netAmount.amount),
            currency,
          })),
        ),
        billedAmount: prepareValues(
          Object.entries(groupedEntries).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.billedAmount.amount),
            currency,
          })),
        ),
        chargedAmount: prepareValues(
          Object.entries(groupedEntries).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.billedAmount.amount),
            currency,
          })),
        ),
        toChargeAmount: prepareValues(
          Object.entries(groupedEntries).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.remainingAmount.amount),
            currency,
          })),
        ),
        compensatedAmount: prepareValues(
          Object.entries(groupedEntries).map(([currency, reports]) => ({
            amount: sumBy(reports, (report) => report.compensatedAmount.amount),
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

function calculateReportEntry(
  report: Report,
  workspaces: Workspace[],
): ReportViewEntry {
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
    if (report.linkCostReport?.some((link) => maybe.isAbsent(link.cost))) {
      return "clarified";
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
    originalReport: report,
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
      (previousReport) => {
        if (
          isSameDay(addDays(previousReport.periodEnd, 1), report.periodStart)
        ) {
          return {
            adjacency: "adjacent",
          };
        }
        if (previousReport.periodEnd < report.periodStart) {
          return {
            adjacency: "separated",
          };
        }
        return {
          adjacency: "overlaps",
        };
      },
    ),
  };
}
