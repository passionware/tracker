import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import { Maybe } from "@passionware/monads";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { useBillingEntryFromData, useBillingView } from "@/services/front/ReportDisplayService/_private/billing.ts";
import { useCostEntryFromData, useCostView } from "@/services/front/ReportDisplayService/_private/cost.ts";
import { useReportEntryFromData, useReportView } from "@/services/front/ReportDisplayService/_private/report.ts";
import { ReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

export function createReportDisplayService(
  config: WithServices<
    [
      WithReportService,
      WithBillingService,
      WithWorkspaceService,
      WithCostService,
      WithExchangeService,
    ]
  >,
): ReportDisplayService {
  return {
    useReportView: (query, selectedIds) => {
      const reports = config.services.reportService.useReports(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );

      return useReportView(reports, workspaces, config, selectedIds);
    },
    useBillingView: (query, selectedIds) => {
      const billings = config.services.billingService.useBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useBillingView(billings, workspaces, config, selectedIds);
    },
    useCostView: (query, selectedIds) => {
      const costs = config.services.costService.useCosts(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useCostView(costs, workspaces, config, selectedIds);
    },
    useReportEntry: (id: Maybe<number>) => {
      const report = config.services.reportService.useReport(id);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useReportEntryFromData(report, workspaces);
    },
    useBillingEntry: (id: Maybe<number>) => {
      const billing = config.services.billingService.useBilling(id);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useBillingEntryFromData(billing, workspaces);
    },
    useCostEntry: (id: Maybe<number>) => {
      const cost = config.services.costService.useCost(id);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useCostEntryFromData(cost, workspaces);
    },
  };
}
