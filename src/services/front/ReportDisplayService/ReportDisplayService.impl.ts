import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import {
  Workspace,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientBillingViewEntry,
  ContractorReportViewEntry,
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
        maybe.map(
          data.reports.map((report) =>
            calculateReportEntry(report, data.workspaces),
          ),
          (entries) => ({
            entries,
            total: {
              netAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.netAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.netAmount.currency,
                    },
              reconciledAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.reconciledAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.reconciledAmount.currency,
                    },
              chargedAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.billedAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.billedAmount.currency,
                    },
              toChargeAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.remainingAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.remainingAmount.currency,
                    },
            },
          }),
        ),
      );
    },
    useBillingView: (query) => {
      const billings =
        config.services.clientBillingService.useClientBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return rd.useMemoMap(rd.combine({ billings, workspaces }), (data) =>
        maybe.map(
          data.billings.map((billing) =>
            calculateBilling(billing, data.workspaces),
          ),
          (entries) => ({
            entries,
            total: {
              netAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.netAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.netAmount.currency,
                    },
              grossAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.grossAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.grossAmount.currency,
                    },
              matchedAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.matchedAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.matchedAmount.currency,
                    },
              remainingAmount:
                entries.length === 0
                  ? null
                  : {
                      amount: entries.reduce(
                        (acc, entry) => acc + entry.remainingAmount.amount,
                        0,
                      ),
                      currency: entries[0]?.remainingAmount.currency,
                    },
            },
          }),
        ),
      );
    },
  };
}
function calculateReportEntry(
  report: ContractorReport,
  workspaces: Workspace[],
): ContractorReportViewEntry {
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

  function getStatus() {
    if (remainingAmount === 0) {
      if (hasAtLeastOneClarification) {
        return "clarified";
      } else {
        return "billed";
      }
    } else if (remainingAmount > 0 && sumOfBillingAmounts > 0) {
      return "partially-billed";
    } else {
      return "uncovered";
    }
  }

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
    status: getStatus(),
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
): ClientBillingViewEntry {
  const sumOfLinkedAmounts =
    billing.linkBillingReport?.reduce(
      (acc, link) => acc + (link.linkAmount ?? 0),
      0,
    ) ?? 0;
  const remainingAmount = billing.totalNet - sumOfLinkedAmounts;

  function getStatus() {
    if (remainingAmount === 0) {
      const hasAtLeastOneClarification = billing.linkBillingReport?.some(
        (link) => link.linkType === "clarify",
      );
      if (hasAtLeastOneClarification) {
        return "clarified";
      }
      return "matched";
    } else if (remainingAmount > 0 && sumOfLinkedAmounts > 0) {
      return "partially-matched";
    } else {
      return "unmatched";
    }
  }

  const status = getStatus();

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
      switch (link.linkType) {
        case "reconcile":
          return {
            id: link.id,
            type: "reconcile",
            amount: {
              amount: link.linkAmount ?? 0,
              currency: billing.currency,
            },
            contractorReport: maybe.getOrThrow(
              link.contractorReport,
              "Contractor report link is required to calculate billing reconcile link",
            ),
          };
        case "clarify":
          return {
            id: link.id,
            type: "clarify",
            amount: {
              amount: link.linkAmount ?? 0,
              currency: billing.currency,
            },
            justification: link.clarifyJustification,
          };
      }
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
