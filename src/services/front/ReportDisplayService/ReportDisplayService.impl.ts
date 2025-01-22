import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { useBillingView } from "@/services/front/ReportDisplayService/_private/billing.ts";
import { useCostView } from "@/services/front/ReportDisplayService/_private/cost.ts";
import { useReportView } from "@/services/front/ReportDisplayService/_private/report.ts";
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
    useReportView: (query) => {
      const reports = config.services.reportService.useReports(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );

      return useReportView(reports, workspaces, config);
    },
    useBillingView: (query) => {
      const billings = config.services.billingService.useBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useBillingView(billings, workspaces, config);
    },
    useCostView: (query) => {
      const costs = config.services.costService.useCosts(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return useCostView(costs, workspaces, config);
    },
  };
}
