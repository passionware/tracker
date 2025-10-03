import { MergeServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithProjectIterationDisplayService } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithReportGenerationService } from "@/services/io/ReportGenerationService/ReportGenerationService";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

/**
 * Ideally this should contain all the services that are safe to use by the front-end widgets.
 */
export type FrontServices = MergeServices<
  [
    WithAuthService,
    WithClientService,
    WithReportService,
    WithLocationService,
    WithNavigationService,
    WithRoutingService,
    WithFormatService,
    WithReportDisplayService,
    WithMessageService,
    WithMutationService,
    WithContractorService,
    WithWorkspaceService,
    WithCostService,
    WithPreferenceService,
    WithVariableService,
    WithBillingService,
    WithExpressionService,
    WithProjectService,
    WithProjectIterationService,
    WithProjectIterationDisplayService,
    WithReportGenerationService,
  ]
>;

export type WithFrontServices = {
  services: FrontServices;
};
