import { ReportQuery } from "@/api/reports/reports.api";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithQueryParamsService } from "@/services/internal/QueryParamsService/QueryParamsService";
import { WithAuthService } from "@/services/io/AuthService/AuthService";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { WithProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";

export interface ReportsWidgetProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithPreferenceService,
      WithWorkspaceService,
      WithMessageService,
      WithExpressionService,
      WithFormatService & WithRoutingService,
      WithQueryParamsService<{ reports: ReportQuery }>,
      WithAuthService,
      WithReportService,
      WithContractorService,
      WithFormatService,
      WithExchangeService,
      WithProjectIterationService,
      WithProjectService,
    ]
  > {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}
