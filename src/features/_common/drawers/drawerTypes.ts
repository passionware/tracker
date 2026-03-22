import type { WithServices } from "@/platform/typescript/services.ts";
import type { WithFormatService } from "@/services/FormatService/FormatService.ts";
import type { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import type { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import type { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import type { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import type { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import type { WithProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import type { WithProjectIterationDisplayService } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import type { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import type { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import type { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";

export type DrawerServices = WithServices<
  [
    WithFormatService,
    WithMutationService,
    WithPreferenceService,
    WithReportDisplayService,
    WithClientService,
    WithContractorService,
    WithWorkspaceService,
    WithExpressionService,
    WithNavigationService,
    WithProjectIterationService,
    WithProjectIterationDisplayService,
  ]
>;

export type DrawerContext = {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
};
