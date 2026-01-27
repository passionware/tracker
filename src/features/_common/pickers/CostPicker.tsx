import { Cost } from "@/api/cost/cost.api.ts";
import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { InlineCostSearch } from "@/features/_common/inline-search/InlineCostSearch.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { maybe, rd } from "@passionware/monads";
import { WithMutationService } from "@/services/io/MutationService/MutationService";

export interface CostPickerProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithContractorService,
      WithCostService,
      WithClientService,
      WithWorkspaceService,
      WithMutationService,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  previewId?: Cost["id"];
  onSelect: (costId: number) => void;
  className?: string;
}

export function CostPicker({
  services,
  workspaceId,
  clientId,
  previewId,
  onSelect,
  className,
}: CostPickerProps) {
  const previewCost = services.costService.useCost(
    previewId ? maybe.of(previewId) : maybe.ofAbsent(),
  );

  const query =
    rd.tryMap(previewCost, (cost: Cost) =>
      costQueryUtils
        .getBuilder(cost.workspaceId, idSpecUtils.ofAll())
        .build((q) => [
          q.withFilter("workspaceId", {
            operator: "oneOf",
            value: [cost.workspaceId],
          }),
          ...(cost.contractorId
            ? [
                q.withFilter("contractorId", {
                  operator: "oneOf",
                  value: [cost.contractorId],
                }),
              ]
            : []),
        ]),
    ) ??
    costQueryUtils.ensureDefault(
      costQueryUtils.ofDefault(workspaceId, clientId),
      workspaceId,
      clientId,
    );

  return (
    <InlineCostSearch
      services={services}
      query={query}
      onSelect={(data) => onSelect(data.costId)}
      maxSourceAmount={maybe.ofAbsent()}
      showDescription={false}
      showTargetValue={false}
      className={className}
    />
  );
}
