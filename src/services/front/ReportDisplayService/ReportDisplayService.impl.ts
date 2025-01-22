import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { generateBillingView } from "@/services/front/ReportDisplayService/_private/generateBillingView.ts";
import { generateCostView } from "@/services/front/ReportDisplayService/_private/generateCostView.ts";
import { generateReportView } from "@/services/front/ReportDisplayService/_private/generateReportView.ts";
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

      return generateReportView(reports, workspaces, config);
    },
    useBillingView: (query) => {
      const billings = config.services.billingService.useBillings(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return generateBillingView(billings, workspaces, config);
    },
    useCostView: (query) => {
      const costs = config.services.costService.useCosts(query);
      const workspaces = config.services.workspaceService.useWorkspaces(
        workspaceQueryUtils.ofEmpty(),
      );
      return generateCostView(costs, workspaces, config);
    },
  };
}
