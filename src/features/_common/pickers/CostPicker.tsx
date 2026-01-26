import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { InlineCostSearch } from "@/features/_common/inline-search/InlineCostSearch.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe } from "@passionware/monads";

export interface CostPickerProps
  extends WithServices<
    [WithReportDisplayService, WithFormatService, WithContractorService]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  onSelect: (costId: number) => void;
  className?: string;
}

export function CostPicker({
  services,
  workspaceId,
  clientId,
  onSelect,
  className,
}: CostPickerProps) {
  const query = costQueryUtils.ensureDefault(
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
