import { MergeServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithAiMatchingService } from "@/services/front/AiMatchingService/AiMatchingService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithGeneratedReportViewService } from "@/services/front/GeneratedReportViewService/GeneratedReportViewService.ts";
import { WithProjectIterationDisplayService } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import { WithReconciliationService } from "@/services/front/ReconciliationService/ReconciliationService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithIdleDetectionService } from "@/services/internal/IdleDetectionService/IdleDetectionService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithQueryParamsService } from "@/services/internal/QueryParamsService/QueryParamsService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithCockpitAuthService } from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithGeneratedReportSourceService } from "@/services/io/GeneratedReportSourceService/GeneratedReportSourceService.ts";
import { WithGeneratedReportSourceWriteService } from "@/services/io/GeneratedReportSourceWriteService/GeneratedReportSourceWriteService";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithActivityService } from "@/services/io/ActivityService/ActivityService.ts";
import { WithIterationTriggerService } from "@/services/io/IterationTriggerService/IterationTriggerService.ts";
import { WithProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import { WithEventQueueService } from "@/services/io/EventQueueService/EventQueueService.ts";
import { WithProjectRateService } from "@/services/io/ProjectRateService/ProjectRateService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithTaskDefinitionService } from "@/services/io/TaskDefinitionService/TaskDefinitionService.ts";
import { WithTimeEntryService } from "@/services/io/TimeEntryService/TimeEntryService.ts";
import { WithReportGenerationService } from "@/services/io/ReportGenerationService/ReportGenerationService";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { WithClientCubeReportService } from "@/services/cockpit/ClientCubeReportService/ClientCubeReportService.ts";
import { WithCockpitTenantService } from "@/services/cockpit/CockpitTenantService/CockpitTenantService.ts";
import { WithTmetricDashboardService } from "@/services/front/TmetricDashboardService/TmetricDashboardService.ts";
import { WithDialogService } from "@/services/front/DialogService/DialogService";
import { BillingQuery } from "@/api/billing/billing.api";
import { ClientQuery } from "@/api/clients/clients.api.ts";
import { CostQuery } from "@/api/cost/cost.api";
import { DashboardQuery } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { ProjectQuery } from "@/api/project/project.api";
import { ReportQuery } from "@/api/reports/reports.api";
import { UserQuery } from "@/api/user/user.api";
import { VariableQuery } from "@/api/variable/variable.api";
import { WorkspaceQuery } from "@/api/workspace/workspace.api.ts";

/**
 * Ideally this should contain all the services that are safe to use by the front-end widgets.
 */
export type FrontServices = MergeServices<
  [
    WithAuthService,
    WithCockpitAuthService,
    WithClientService,
    WithReportService,
    WithLocationService,
    WithNavigationService,
    WithQueryParamsService<{
      projects: ProjectQuery;
      users: UserQuery;
      reports: ReportQuery;
      billing: BillingQuery;
      clients: ClientQuery;
      workspaces: WorkspaceQuery;
      costs: CostQuery;
      variables: VariableQuery;
      dashboard: DashboardQuery;
    }>,
    WithFormatService,
    WithReportDisplayService,
    WithReconciliationService,
    WithMessageService,
    WithMutationService,
    WithContractorService,
    WithWorkspaceService,
    WithCostService,
    WithExchangeService,
    WithPreferenceService,
    WithAiMatchingService,
    WithVariableService,
    WithBillingService,
    WithExpressionService,
    WithProjectService,
    WithProjectIterationService,
    WithIterationTriggerService,
    WithTimeEntryService,
    WithTaskDefinitionService,
    WithActivityService,
    WithProjectRateService,
    WithEventQueueService,
    WithIdleDetectionService,
    WithProjectIterationDisplayService,
    WithReportGenerationService,
    WithGeneratedReportSourceWriteService,
    WithGeneratedReportSourceService,
    WithGeneratedReportViewService,
    WithClientCubeReportService,
    WithCockpitTenantService,
    WithTmetricDashboardService,
    WithDialogService,
    WithQueryParamsService<{
      projects: ProjectQuery;
      users: UserQuery;
      reports: ReportQuery;
      billing: BillingQuery;
      clients: ClientQuery;
      workspaces: WorkspaceQuery;
      costs: CostQuery;
      variables: VariableQuery;
      dashboard: DashboardQuery;
    }>,
  ]
>;

export type WithFrontServices = {
  services: FrontServices;
};
