import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ContractorReportView,
  ReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { rd } from "@passionware/monads";

export function createReportDisplayService(
  config: WithServices<[WithContractorReportService]>,
): ReportDisplayService {
  function calculateReport(report: ContractorReport): ContractorReportView {
    const haveSameCurrency = report.linkBillingReport?.every(
      (link) => link.clientBilling?.currency === report.currency,
    );
    const haveSameClient = report.linkBillingReport?.every(
      (link) => link.clientBilling?.clientId === report.clientId,
    );
    if (!(haveSameCurrency && haveSameClient)) {
      throw new Error(
        "Invalid report. All linked billing reports must have the same currency and client.",
      );
    }

    const sumOfBilledAmounts =
      report.linkBillingReport?.reduce(
        (acc, link) => acc + (link.reconcileAmount ?? 0),
        0,
      ) ?? 0;
    const remainingAmount = report.netValue - sumOfBilledAmounts;

    return {
      id: report.id,
      netAmount: {
        amount: report.netValue,
        currency: report.currency,
      },
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      description: report.description,
      status: remainingAmount === 0 ? "billed" : "uncovered",
      reconciledAmount: {
        amount: sumOfBilledAmounts,
        currency: report.currency,
      },
      remainingAmount: {
        amount: remainingAmount,
        currency: report.currency,
      },
    };
  }

  return {
    useReportView: (query) => {
      return rd.useMemoMap(
        config.services.contractorReportService.useContractorReports(query),
        (data) => data.map(calculateReport),
      );
    },
  };
}
