import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithQueryParamsService } from "@/services/internal/QueryParamsService/QueryParamsService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

export interface PotentialCostWidgetProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithContractorService,
      WithClientService,
      WithWorkspaceService,
      WithPreferenceService,
      WithMutationService,
      WithMessageService,
      WithExpressionService,
      WithQueryParamsService<{
        costs: import("@/api/cost/cost.api").CostQuery;
      }>,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}
