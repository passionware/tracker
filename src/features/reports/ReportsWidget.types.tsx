import { WithServices } from "@/platform/typescript/services.ts";
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
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

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
    ]
  > {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}
