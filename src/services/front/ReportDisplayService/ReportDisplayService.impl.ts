import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import {
  Workspace,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientBillingView,
  ContractorReportView,
  ReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientBillingService } from "@/services/io/ClientBillingService/ClientBillingService.ts";
import { WithContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";

export function createReportDisplayService(
  config: WithServices<
    [
      WithContractorReportService,
      WithClientBillingService,
      WithWorkspaceService,
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
      return rd.useMemoMap(rd.combine({ reports, workspaces }), (data) =>
        data.reports.map((report) => calculateReport(report, data.workspaces)),
      );
    },
    useBillingView: (query) => {
      const billings =
        config.services.clientBillingService.useClientBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return rd.useMemoMap(rd.combine({ billings, workspaces }), (data) =>
        data.billings.map((billing) =>
          calculateBilling(billing, data.workspaces),
        ),
      );
    },
  };
}
function calculateReport(
  report: ContractorReport,
  workspaces: Workspace[],
): ContractorReportView {
  const haveSameClient = report.linkBillingReport?.every(
    (link) =>
      link.linkType === "clarify" ||
      link.clientBilling?.clientId === report.clientId,
  );
  if (!haveSameClient) {
    throw new Error(
      "Invalid report. All linked billing reports must have the same currency and client.",
    );
  }

  const sumOfLinkedAmounts =
    report.linkBillingReport?.reduce(
      (acc, link) => acc + (link.linkAmount ?? 0),
      0,
    ) ?? 0;
  const remainingAmount = report.netValue - sumOfLinkedAmounts;
  const hasAtLeastOneClarification = report.linkBillingReport?.some(
    (link) => link.linkType === "clarify",
  );
  const sumOfBillingAmounts =
    report.linkBillingReport
      ?.filter((link) => link.linkType === "reconcile")
      ?.reduce((acc, link) => acc + (link.linkAmount ?? 0), 0) ?? 0;

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
      switch (link.linkType) {
        case "reconcile":
          return {
            id: link.id,
            amount: {
              amount: link.linkAmount ?? 0,
              currency: link.clientBilling?.currency ?? report.currency,
            },
            linkType: "clientBilling",
            billing: maybe.getOrThrow(
              link.clientBilling,
              "Client billing is required to calculate report",
            ),
          };
        case "clarify":
          return {
            id: link.id,
            amount: {
              amount: link.linkAmount ?? 0,
              currency: report.currency,
            },
            linkType: "clarification",
            justification: link.clarifyJustification,
          };
      }
    }),
    workspace: maybe.getOrThrow(
      workspaces.find((workspace) => workspace.id === report.workspaceId),
      "Workspace is missing",
    ),
  };
}

function calculateBilling(
  billing: ClientBilling,
  workspaces: Workspace[],
): ClientBillingView {
  const sumOfLinkedAmounts =
    billing.linkBillingReport?.reduce(
      (acc, link) => acc + (link.linkAmount ?? 0),
      0,
    ) ?? 0;
  const remainingAmount = billing.totalNet - sumOfLinkedAmounts;
  const status = remainingAmount === 0 ? "matched" : "unmatched";

  return {
    id: billing.id,
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
    links: (billing.linkBillingReport ?? [])?.map((link) => {
      return {
        id: link.id,
        amount: {
          amount: link.linkAmount ?? 0,
          currency: billing.currency,
        },
        contractorReport: maybe.getOrThrow(
          link.contractorReport,
          "Contractor report link is required to calculate billing",
        ),
      };
    }),
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
  };
}
