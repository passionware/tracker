import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ContractorReportView,
  ReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { maybe, rd } from "@passionware/monads";

export function createReportDisplayService(
  config: WithServices<[WithContractorReportService]>,
): ReportDisplayService {
  function calculateReport(report: ContractorReport): ContractorReportView {
    const haveSameClient = report.linkBillingReport?.every(
      (link) =>
        link.clientBilling === null ||
        link.clientBilling?.clientId === report.clientId,
    );
    if (!haveSameClient) {
      throw new Error(
        "Invalid report. All linked billing reports must have the same currency and client.",
      );
    }

    const sumOfLinkedAmounts =
      report.linkBillingReport?.reduce(
        (acc, link) => acc + (link.reconcileAmount ?? 0),
        0,
      ) ?? 0;
    const remainingAmount = report.netValue - sumOfLinkedAmounts;
    const hasAtLeastOneClarification = report.linkBillingReport?.some(
      (link) => link.linkType === "clarify",
    );
    const sumOfBillingAmounts =
      report.linkBillingReport
        ?.filter((link) => link.clientBilling !== null)
        ?.reduce((acc, link) => acc + (link.reconcileAmount ?? 0), 0) ?? 0;

    return {
      id: report.id,
      contractor: maybe.getOrThrow(report.contractor, "Contractor is missing"),
      netAmount: {
        amount: report.netValue,
        currency: report.currency,
      },
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      description: report.description,
      status:
        remainingAmount === 0
          ? hasAtLeastOneClarification
            ? "clarified"
            : "billed"
          : "uncovered",
      reconciledAmount: {
        amount: sumOfLinkedAmounts,
        currency: report.currency,
      },
      billedAmount: {
        amount: sumOfBillingAmounts,
        currency: report.currency,
      },
      remainingAmount: {
        amount: remainingAmount,
        currency: report.currency,
      },
      links: (report.linkBillingReport ?? [])?.map((link) => {
        if (link.clientBilling) {
          return {
            id: link.id,
            amount: {
              amount: link.reconcileAmount ?? 0,
              currency: link.clientBilling.currency ?? report.currency,
            },
            linkType: "clientBilling",
            billing: link.clientBilling,
          };
        } else {
          return {
            id: link.id,
            amount: {
              amount: link.reconcileAmount ?? 0,
              currency: report.currency,
            },
            linkType: "clarification",
            justification: link.clarifyJustification ?? "",
          };
        }
      }),
    };
  }

  return {
    useReportView: (query) => {
      return rd.useMemoMap(
        config.services.contractorReportService.useContractorReports(query),
        (data) => data.map(calculateReport),
      );
    },
    useBillingView: () => {
      return rd.ofError(new Error("Not implemented"));
    },
  };
}
