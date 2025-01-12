import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReport } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Cost } from "@/api/cost/cost.api.ts";
import {
  Workspace,
  workspaceQueryUtils,
} from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
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
import { groupBy, sumBy } from "lodash";

export function createReportDisplayService(
  config: WithServices<
    [
      WithContractorReportService,
      WithClientBillingService,
      WithWorkspaceService,
      WithCostService,
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
      return rd.useMemoMap(rd.combine({ reports, workspaces }), (data) => {
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
            netAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(reports, (report) => report.netAmount.amount),
                currency,
              }),
            ),
            reconciledAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(
                  reports,
                  (report) => report.reconciledAmount.amount,
                ),
                currency,
              }),
            ),
            chargedAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(reports, (report) => report.billedAmount.amount),
                currency,
              }),
            ),
            toChargeAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(
                  reports,
                  (report) => report.remainingAmount.amount,
                ),
                currency,
              }),
            ),
          },
        };
      });
    },
    useBillingView: (query) => {
      const billings =
        config.services.clientBillingService.useClientBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return rd.useMemoMap(rd.combine({ billings, workspaces }), (data) => {
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
            netAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(reports, (report) => report.netAmount.amount),
                currency,
              }),
            ),
            grossAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(reports, (report) => report.grossAmount.amount),
                currency,
              }),
            ),
            matchedAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(reports, (report) => report.matchedAmount.amount),
                currency,
              }),
            ),
            remainingAmount: Object.entries(groupedEntries).map(
              ([currency, reports]) => ({
                amount: sumBy(
                  reports,
                  (report) => report.remainingAmount.amount,
                ),
                currency,
              }),
            ),
          },
        };
      });
    },
    useCostView: (query) => {
      const costs = config.services.costService.useCosts(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return rd.useMemoMap(rd.combine({ costs, workspaces }), (data) => {
        const entries = data.costs.map((cost) =>
          calculateCost(cost, data.workspaces),
        );
        const groupedEntries = groupBy(
          entries,
          (cost) => cost.netAmount.currency,
        );
        const total = {
          netAmount: Object.entries(groupedEntries).map(
            ([currency, costs]) => ({
              amount: sumBy(costs, (cost) => cost.netAmount.amount),
              currency,
            }),
          ),
          matchedAmount: Object.entries(groupedEntries).map(
            ([currency, costs]) => ({
              amount: sumBy(costs, (cost) => cost.matchedAmount.amount),
              currency,
            }),
          ),
          remainingAmount: Object.entries(groupedEntries).map(
            ([currency, costs]) => ({
              amount: sumBy(costs, (cost) => cost.remainingAmount.amount),
              currency,
            }),
          ),
        };

        return {
          entries,
          total,
        };
      });
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
      "Invalid report. All linked billing reports must have the same client.",
    );
  }

  const chargedAmount = sumBy(
    report.linkBillingReport,
    (link) => link.linkAmount,
  );
  const remainingChargeAmount = report.netValue - chargedAmount;
  const hasAtLeastOneClarification = report.linkBillingReport?.some(
    (link) => link.linkType === "clarify",
  );
  const sumOfChargeAmounts = sumBy(
    report.linkBillingReport?.filter((link) => link.linkType === "reconcile"),
    (link) => link.linkAmount,
  );

  function getBillingStatus() {
    if (remainingChargeAmount === 0) {
      if (hasAtLeastOneClarification) {
        return "clarified";
      } else {
        return "billed";
      }
    } else if (remainingChargeAmount > 0 && sumOfChargeAmounts > 0) {
      return "partially-billed";
    } else {
      return "uncovered";
    }
  }
  ////

  const compensationAmount = sumBy(
    report.linkCostReport,
    (link) => link.reportAmount,
  );
  const remainingCompensationAmount =
    remainingChargeAmount + sumOfChargeAmounts - compensationAmount;
  const remainingFullCompensationAmount = report.netValue - compensationAmount;

  function getCompensationStatus() {
    if (remainingCompensationAmount === 0) {
      return "compensated";
    } else if (remainingCompensationAmount > 0 && compensationAmount > 0) {
      return "partially-compensated";
    } else {
      return "uncompensated";
    }
  }

  function getFullCompensationStatus() {
    if (remainingFullCompensationAmount === 0) {
      return "compensated";
    } else if (remainingFullCompensationAmount > 0 && compensationAmount > 0) {
      return "partially-compensated";
    } else {
      return "uncompensated";
    }
  }

  return {
    id: report.id,
    clientId: report.clientId,
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
    compensationStatus: getCompensationStatus(),
    fullCompensationStatus: getFullCompensationStatus(),
    //
    reconciledAmount: {
      amount: chargedAmount,
      currency: report.currency,
    },
    billedAmount: {
      amount: sumOfChargeAmounts,
      currency: report.currency,
    },
    remainingAmount: {
      amount: remainingChargeAmount,
      currency: report.currency,
    },
    compensatedAmount: {
      amount: compensationAmount,
      currency: report.currency,
    },
    remainingCompensationAmount: {
      amount: remainingCompensationAmount,
      currency: report.currency,
    },
    remainingFullCompensationAmount: {
      amount: remainingFullCompensationAmount,
      currency: report.currency,
    },
    costLinks: (report.linkCostReport ?? [])?.map((link) => ({
      id: link.id,
      amount: {
        amount: link.costAmount,
        currency: report.currency,
      },
      description: link.description,
      cost: maybe.getOrThrow(link.cost, "Cost is required to calculate report"),
    })),
    billingLinks: (report.linkBillingReport ?? [])?.map((link) => {
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
  const sumOfLinkedAmounts = sumBy(
    billing.linkBillingReport,
    (link) => link.linkAmount,
  );
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
    clientId: billing.clientId,
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

function calculateCost(cost: Cost, workspaces: Workspace[]): CostEntry {
  const sumOfLinkedAmounts = sumBy(cost.linkReports, (link) => link.costAmount);
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
    linkReports: maybe
      .getOrThrow(
        cost.linkReports,
        "Link reports are missing to calculate cost",
      )
      .map((link) => {
        const contractorReport = maybe.getOrThrow(
          link.contractorReport,
          "Contractor report must be present in link to calculate report display view",
        );
        return {
          id: link.id,
          costAmount: {
            amount: link.costAmount,
            currency: cost.currency,
          },
          reportAmount: {
            amount: link.reportAmount,
            currency: contractorReport.currency,
          },
          description: link.description,
          contractorReport: contractorReport,
        };
      }),
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
