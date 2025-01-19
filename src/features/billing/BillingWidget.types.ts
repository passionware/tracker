import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

export type BillingWidgetProps = {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
} & WithServices<
  [
    WithReportDisplayService,
    WithFormatService,
    WithClientService,
    WithMutationService /*todo use auth flow*/,
    WithPreferenceService,
    WithWorkspaceService,
    WithContractorService,
    WithMessageService,
  ]
>;
